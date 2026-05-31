import WaButton from "@awesome.me/webawesome/dist/react/button/index.js";
import WaInput from "@awesome.me/webawesome/dist/react/input/index.js";
import WaTextarea from "@awesome.me/webawesome/dist/react/textarea/index.js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useColorSchemeValue } from "sanity";

import { useStudioClient } from "../hooks/useStudioClient";
import "./sanityImageManagerTool.css";

type SanityImageAsset = {
  _id: string;
  _createdAt: string;
  altText?: string;
  description?: string;
  extension?: string;
  mimeType?: string;
  originalFilename?: string;
  size?: number;
  title?: string;
  url: string;
  metadata?: {
    dimensions?: {
      aspectRatio?: number;
      height?: number;
      width?: number;
    };
    lqip?: string;
  };
  usedBy?: number;
  references?: {
    _id: string;
    _type: string;
    name?: string;
    heading?: string;
    title?: string;
  }[];
};

const imageAssetQuery = `*[_type == "sanity.imageAsset" && defined(url)] | order(_createdAt desc)[0...200] {
  _id,
  _createdAt,
  altText,
  description,
  extension,
  mimeType,
  originalFilename,
  size,
  title,
  url,
  metadata {
    dimensions {
      aspectRatio,
      height,
      width
    },
    lqip
  },
  "usedBy": count(*[references(^._id) && !(_id in path("_.**"))]),
  "references": *[references(^._id) && !(_id in path("_.**"))][0...8] {
    _id,
    _type,
    name,
    heading,
    title
  }
}`;

const getInputValue = (event: unknown): string =>
  (event as { target: { value: string } }).target.value;

const fileSize = (bytes?: number): string => {
  if (!bytes) {
    return "Unknown size";
  }

  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;

  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }

  return `${value >= 10 ? value.toFixed(0) : value.toFixed(1)} ${units[unit]}`;
};

const imageDimensions = (asset: SanityImageAsset): string => {
  const width = asset.metadata?.dimensions?.width;
  const height = asset.metadata?.dimensions?.height;

  if (!width || !height) {
    return "Unknown dimensions";
  }

  return `${width} x ${height}`;
};

const imageLabel = (asset: SanityImageAsset): string =>
  asset.title?.trim() ||
  asset.altText?.trim() ||
  asset.originalFilename?.trim() ||
  "Untitled image";

const referenceLabel = (reference: NonNullable<SanityImageAsset["references"]>[number]) =>
  reference.title?.trim() ||
  reference.heading?.trim() ||
  reference.name?.trim() ||
  `${reference._type} document`;

const formatDate = (value: string): string =>
  new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

export function SanityImageManagerTool() {
  const client = useStudioClient({ apiVersion: "2026-05-01" });
  const colorScheme = useColorSchemeValue();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [assets, setAssets] = useState<SanityImageAsset[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftAltText, setDraftAltText] = useState("");
  const [draftDescription, setDraftDescription] = useState("");

  const loadAssets = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const nextAssets = await client.fetch<SanityImageAsset[]>(imageAssetQuery);
      setAssets(nextAssets);
      setSelectedAssetId((current) => current ?? nextAssets[0]?._id ?? null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load Sanity images.");
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    void loadAssets();
  }, [loadAssets]);

  const filteredAssets = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return assets;
    }

    return assets.filter((asset) =>
      [asset.title, asset.altText, asset.description, asset.originalFilename, asset._id]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(query)),
    );
  }, [assets, search]);

  const selectedAsset = useMemo(
    () => assets.find((asset) => asset._id === selectedAssetId) ?? filteredAssets[0] ?? null,
    [assets, filteredAssets, selectedAssetId],
  );

  useEffect(() => {
    setDraftTitle(selectedAsset?.title ?? "");
    setDraftAltText(selectedAsset?.altText ?? "");
    setDraftDescription(selectedAsset?.description ?? "");
  }, [selectedAsset]);

  const clearNotice = () => {
    window.setTimeout(() => setNotice(null), 2800);
  };

  const handleUpload = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) {
      return;
    }

    setUploading(true);
    setError(null);
    setNotice(null);

    try {
      const asset = await client.assets.upload("image", file, {
        filename: file.name,
        contentType: file.type,
      });
      await loadAssets();
      setSelectedAssetId(asset._id);
      setNotice("Image uploaded.");
      clearNotice();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not upload image.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleSaveMetadata = async () => {
    if (!selectedAsset) {
      return;
    }

    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      await client
        .patch(selectedAsset._id)
        .set({
          altText: draftAltText.trim(),
          description: draftDescription.trim(),
          title: draftTitle.trim(),
        })
        .commit();
      await loadAssets();
      setNotice("Image details saved.");
      clearNotice();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save image details.");
    } finally {
      setSaving(false);
    }
  };

  const handleCopyUrl = async () => {
    if (!selectedAsset) {
      return;
    }

    try {
      await navigator.clipboard.writeText(selectedAsset.url);
      setNotice("Image URL copied.");
      clearNotice();
    } catch {
      setError("Could not copy the image URL.");
    }
  };

  const handleDelete = async () => {
    if (!selectedAsset) {
      return;
    }

    const label = imageLabel(selectedAsset);
    const confirmed = window.confirm(
      `Delete "${label}" from Sanity assets? This will fail if Sanity blocks the asset because it is still referenced.`,
    );

    if (!confirmed) {
      return;
    }

    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      await client.delete(selectedAsset._id);
      setSelectedAssetId(null);
      await loadAssets();
      setNotice("Image deleted.");
      clearNotice();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not delete the image. Check whether it is still referenced.",
      );
    } finally {
      setSaving(false);
    }
  };

  const rootClassName =
    colorScheme === "dark"
      ? "studio-tool sim studio-tool--dark"
      : "studio-tool sim studio-tool--light";

  return (
    <main className={rootClassName}>
      <header className="sim__header">
        <div>
          <p>Assets</p>
          <h1>Image Manager</h1>
        </div>
        <div className="sim__actions">
          <WaButton disabled={loading} onClick={() => void loadAssets()} size="xs">
            Refresh
          </WaButton>
          <input
            accept="image/*"
            className="sim__upload-input"
            disabled={uploading}
            onChange={(event) => void handleUpload(event.currentTarget.files)}
            ref={fileInputRef}
            type="file"
          />
          <WaButton
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            size="xs"
            variant="brand"
          >
            {uploading ? "Uploading..." : "Upload image"}
          </WaButton>
        </div>
      </header>

      {error ? <div className="sim__alert">{error}</div> : null}
      {notice ? <div className="sim__notice">{notice}</div> : null}

      <section className="sim__workspace">
        <aside className="sim__library">
          <div className="sim__search">
            <WaInput
              aria-label="Search images"
              onInput={(event) => setSearch(getInputValue(event))}
              placeholder="Search filename, title, alt text, or asset ID"
              size="xs"
              type="search"
              value={search}
            />
          </div>

          <div className="sim__count">
            {loading
              ? "Loading images..."
              : `${filteredAssets.length} of ${assets.length} images shown`}
          </div>

          <div className="sim__grid">
            {filteredAssets.map((asset) => (
              <WaButton
                appearance="plain"
                className={asset._id === selectedAsset?._id ? "sim__tile is-selected" : "sim__tile"}
                key={asset._id}
                onClick={() => setSelectedAssetId(asset._id)}
                size="xs"
                title={imageLabel(asset)}
              >
                <img
                  alt=""
                  loading="lazy"
                  src={`${asset.url}?w=360&h=260&fit=crop&fm=webp`}
                  style={
                    asset.metadata?.lqip
                      ? { backgroundImage: `url(${asset.metadata.lqip})` }
                      : undefined
                  }
                />
                <span>{imageLabel(asset)}</span>
                <small>{imageDimensions(asset)}</small>
              </WaButton>
            ))}
          </div>

          {!loading && filteredAssets.length === 0 ? (
            <div className="sim__empty">No images match that search.</div>
          ) : null}
        </aside>

        <section className="sim__detail">
          {selectedAsset ? (
            <>
              <div className="sim__preview">
                <img alt="" src={`${selectedAsset.url}?w=1200&fm=webp`} />
              </div>

              <div className="sim__panel">
                <div className="sim__summary">
                  <div>
                    <h2>{imageLabel(selectedAsset)}</h2>
                    <p>{selectedAsset._id}</p>
                  </div>
                  <div className="sim__detail-actions">
                    <WaButton onClick={() => void handleCopyUrl()} size="xs">
                      Copy URL
                    </WaButton>
                    <WaButton href={selectedAsset.url} rel="noreferrer" size="xs" target="_blank">
                      Open
                    </WaButton>
                  </div>
                </div>

                <dl className="sim__meta">
                  <div>
                    <dt>Dimensions</dt>
                    <dd>{imageDimensions(selectedAsset)}</dd>
                  </div>
                  <div>
                    <dt>File size</dt>
                    <dd>{fileSize(selectedAsset.size)}</dd>
                  </div>
                  <div>
                    <dt>Type</dt>
                    <dd>{selectedAsset.mimeType ?? selectedAsset.extension ?? "Unknown type"}</dd>
                  </div>
                  <div>
                    <dt>Uploaded</dt>
                    <dd>{formatDate(selectedAsset._createdAt)}</dd>
                  </div>
                  <div>
                    <dt>Used by</dt>
                    <dd>{selectedAsset.usedBy ?? 0} documents</dd>
                  </div>
                </dl>

                <div className="sim__form">
                  <WaInput
                    label="Title"
                    onInput={(event) => setDraftTitle(getInputValue(event))}
                    size="xs"
                    type="text"
                    value={draftTitle}
                  />
                  <WaInput
                    label="Alt text"
                    onInput={(event) => setDraftAltText(getInputValue(event))}
                    size="xs"
                    type="text"
                    value={draftAltText}
                  />
                  <WaTextarea
                    label="Description"
                    onInput={(event) => setDraftDescription(getInputValue(event))}
                    rows={3}
                    size="xs"
                    value={draftDescription}
                  />
                </div>

                <div className="sim__references">
                  <strong>References</strong>
                  {selectedAsset.references?.length ? (
                    <ul>
                      {selectedAsset.references.map((reference) => (
                        <li key={reference._id}>
                          <span>{referenceLabel(reference)}</span>
                          <small>{reference._type}</small>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>No document references found.</p>
                  )}
                </div>

                <div className="sim__footer-actions">
                  <WaButton
                    disabled={saving}
                    onClick={() => void handleSaveMetadata()}
                    size="xs"
                    variant="brand"
                  >
                    {saving ? "Saving..." : "Save details"}
                  </WaButton>
                  <WaButton
                    className="sim__danger"
                    disabled={saving || Boolean(selectedAsset.usedBy)}
                    onClick={() => void handleDelete()}
                    size="xs"
                    title={
                      selectedAsset.usedBy
                        ? "Images that are still used by documents are protected here."
                        : "Delete this image asset"
                    }
                  >
                    Delete image
                  </WaButton>
                </div>
              </div>
            </>
          ) : (
            <div className="sim__empty-detail">
              {loading ? "Loading image library..." : "Select or upload an image."}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
