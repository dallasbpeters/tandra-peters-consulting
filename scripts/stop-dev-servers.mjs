import { execFileSync } from "node:child_process";
import { rmSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const SLEEP_BUFFER = new Int32Array(new SharedArrayBuffer(4));

const DEV_TARGETS = {
  email: {
    commandNeedles: ["react-email dev", "email dev"],
    cwdRoots: [path.join(REPO_ROOT, "react-email-starter")],
    label: "email",
    ports: [3000],
  },
  site: {
    commandNeedles: ["vite --port=3001"],
    cwdRoots: [REPO_ROOT],
    label: "site",
    ports: [3001],
  },
  studio: {
    cachePaths: [
      path.join(
        REPO_ROOT,
        "studio-tandra-peters",
        "node_modules",
        ".sanity",
        "vite"
      ),
      path.join(REPO_ROOT, "studio-tandra-peters", ".sanity"),
    ],
    commandNeedles: ["sanity dev"],
    cwdRoots: [path.join(REPO_ROOT, "studio-tandra-peters")],
    label: "studio",
    ports: [3333],
  },
};

const readCommand = (command, args) => {
  try {
    return execFileSync(command, args, {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    return "";
  }
};

const normalizeTargetNames = () => {
  const requestedNames = process.argv
    .slice(2)
    .flatMap((argument) => argument.split(","))
    .map((argument) => argument.trim())
    .filter(Boolean);
  const targetNames =
    requestedNames.length > 0 ? requestedNames : Object.keys(DEV_TARGETS);
  const unknownNames = targetNames.filter(
    (targetName) => !Object.hasOwn(DEV_TARGETS, targetName)
  );

  if (unknownNames.length > 0) {
    console.error(
      `[dev-preflight] Unknown dev target: ${unknownNames.join(", ")}`
    );
    process.exit(1);
  }

  return targetNames;
};

const findPidsForPort = (port) =>
  readCommand("lsof", [`-tiTCP:${port}`, "-sTCP:LISTEN"])
    .split("\n")
    .map((pid) => pid.trim())
    .filter(Boolean);

const parseCwd = (output) => {
  const cwdLine = output.split("\n").find((line) => line.startsWith("n"));
  return cwdLine ? cwdLine.slice(1) : "";
};

const inspectProcess = (pid) => ({
  command: readCommand("ps", ["-p", pid, "-o", "command="]).trim(),
  cwd: parseCwd(readCommand("lsof", ["-a", "-p", pid, "-d", "cwd", "-Fn"])),
  pid,
});

const isInsidePath = (childPath, parentPath) => {
  if (!childPath) {
    return false;
  }

  const relativePath = path.relative(
    path.resolve(parentPath),
    path.resolve(childPath)
  );
  return relativePath === "" || !relativePath.startsWith("..");
};

const processMatchesTarget = (processInfo, target) => {
  const cwdMatches = target.cwdRoots.some((cwdRoot) =>
    isInsidePath(processInfo.cwd, cwdRoot)
  );
  const commandMatches =
    processInfo.command.includes(REPO_ROOT) &&
    target.commandNeedles.some((needle) =>
      processInfo.command.includes(needle)
    );

  return cwdMatches || commandMatches;
};

const sleep = (milliseconds) => {
  Atomics.wait(SLEEP_BUFFER, 0, 0, milliseconds);
};

const waitForPortRelease = (pid, port) => {
  const deadline = Date.now() + 2000;

  while (Date.now() < deadline) {
    if (!findPidsForPort(port).includes(pid)) {
      return true;
    }
    sleep(100);
  }

  return !findPidsForPort(port).includes(pid);
};

const killProcess = (pid, signal) => {
  try {
    process.kill(Number(pid), signal);
    return true;
  } catch (error) {
    if (error?.code === "ESRCH") {
      return true;
    }
    throw error;
  }
};

const stopProcess = (target, processInfo, port) => {
  console.log(
    `[dev-preflight] Stopping stale ${target.label} dev server on port ${port} (pid ${processInfo.pid}).`
  );
  killProcess(processInfo.pid, "SIGTERM");

  if (waitForPortRelease(processInfo.pid, port)) {
    return;
  }

  console.warn(
    `[dev-preflight] ${target.label} dev server pid ${processInfo.pid} did not release port ${port}; sending SIGKILL.`
  );
  killProcess(processInfo.pid, "SIGKILL");
  waitForPortRelease(processInfo.pid, port);
};

const stopMatchingProcesses = (target) => {
  let stoppedCount = 0;

  for (const port of target.ports) {
    for (const pid of findPidsForPort(port)) {
      const processInfo = inspectProcess(pid);

      if (processMatchesTarget(processInfo, target)) {
        stopProcess(target, processInfo, port);
        stoppedCount += 1;
      }
    }
  }

  return stoppedCount;
};

const clearCachePaths = (target) => {
  if (!target.cachePaths) {
    return;
  }

  for (const cachePath of target.cachePaths) {
    rmSync(cachePath, { force: true, recursive: true });
  }
};

const findBlockedPorts = (targetNames) => {
  const blockedPorts = [];

  for (const targetName of targetNames) {
    const target = DEV_TARGETS[targetName];

    for (const port of target.ports) {
      const blockingPids = findPidsForPort(port);

      for (const pid of blockingPids) {
        const processInfo = inspectProcess(pid);
        // Only block startup when the lingering process IS a dev server for
        // this target (i.e. it matched but didn't release the port in time).
        // External processes — IDEs, system daemons, etc. — are not our
        // responsibility to kill; Vite/Sanity's own port-selection handles them.
        if (processMatchesTarget(processInfo, target)) {
          blockedPorts.push({ port, processInfo, target });
        }
      }
    }
  }

  return blockedPorts;
};

const reportBlockedPorts = (blockedPorts) => {
  for (const { target, port, processInfo } of blockedPorts) {
    const cwdText = processInfo.cwd ? ` cwd=${processInfo.cwd}` : "";
    console.error(
      `[dev-preflight] Port ${port} for ${target.label} is still in use by pid ${processInfo.pid}.${cwdText}`
    );
    if (processInfo.command) {
      console.error(`[dev-preflight] Command: ${processInfo.command}`);
    }
  }
};

const main = () => {
  const targetNames = normalizeTargetNames();
  const stoppedCount = targetNames.reduce(
    (count, targetName) =>
      count + stopMatchingProcesses(DEV_TARGETS[targetName]),
    0
  );

  for (const targetName of targetNames) {
    clearCachePaths(DEV_TARGETS[targetName]);
  }

  const blockedPorts = findBlockedPorts(targetNames);

  if (blockedPorts.length > 0) {
    reportBlockedPorts(blockedPorts);
    process.exit(1);
  }

  if (stoppedCount === 0) {
    console.log("[dev-preflight] Dev ports are clear.");
  }
};

main();
