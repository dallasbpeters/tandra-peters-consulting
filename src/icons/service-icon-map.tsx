import {
  BadgeCheck,
  Calendar,
  ChatLines,
  CheckCircle,
  ClipboardCheck,
  Clock,
  CloudSunny,
  Eye,
  FireFlame,
  Group,
  Hammer,
  Heart,
  HelpCircle,
  Home,
  HomeUser,
  Leaf,
  LightBulb,
  Mail,
  MapPin,
  Page,
  Phone,
  Ruler,
  Search,
  Shield,
  ShieldCheck,
  Snow,
  Sparks,
  Tools,
  Truck,
  Umbrella,
  User,
  WarningTriangle,
  Wrench,
} from "iconoir-react";
import type { ForwardRefExoticComponent, RefAttributes, SVGProps } from "react";

import type { ServiceIconKey } from "../sanity/service-icon-meta";
import { LEGACY_SERVICE_ICON_ALIASES } from "../sanity/service-icon-meta";

export type IconoirIconComponent = ForwardRefExoticComponent<
  Omit<SVGProps<SVGSVGElement>, "ref"> & RefAttributes<SVGSVGElement>
>;

export type IconoirIconProps = SVGProps<SVGSVGElement> & {
  className?: string;
  width?: string | number;
  height?: string | number;
  strokeWidth?: string | number;
};

const SERVICE_ICONS: Record<ServiceIconKey, IconoirIconComponent> = {
  badgeCheck: BadgeCheck,
  calendar: Calendar,
  chatLines: ChatLines,
  checkCircle: CheckCircle,
  clipboardCheck: ClipboardCheck,
  clock: Clock,
  cloudSunny: CloudSunny,
  eye: Eye,
  fireFlame: FireFlame,
  group: Group,
  hammer: Hammer,
  heart: Heart,
  helpCircle: HelpCircle,
  home: Home,
  homeUser: HomeUser,
  leaf: Leaf,
  lightBulb: LightBulb,
  mail: Mail,
  mapPin: MapPin,
  page: Page,
  phone: Phone,
  ruler: Ruler,
  search: Search,
  shield: Shield,
  shieldCheck: ShieldCheck,
  snow: Snow,
  sparks: Sparks,
  tools: Tools,
  truck: Truck,
  umbrella: Umbrella,
  user: User,
  warningTriangle: WarningTriangle,
  wrench: Wrench,
};

export const getServiceIconComponent = (
  key: string | undefined
): IconoirIconComponent => {
  if (!key) {
    return Search;
  }
  const normalized =
    LEGACY_SERVICE_ICON_ALIASES[key] ?? (key as ServiceIconKey);
  return SERVICE_ICONS[normalized] ?? Search;
};
