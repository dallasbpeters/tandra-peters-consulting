import type { ComponentType, SVGProps } from "react";
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
import {
  LEGACY_SERVICE_ICON_ALIASES,
  type ServiceIconKey,
} from "../sanity/serviceIconMeta";

export type IconoirIconProps = SVGProps<SVGSVGElement> & {
  className?: string;
  width?: string | number;
  height?: string | number;
  strokeWidth?: string | number;
};

const SERVICE_ICONS: Record<ServiceIconKey, ComponentType<IconoirIconProps>> = {
  search: Search,
  page: Page,
  shieldCheck: ShieldCheck,
  hammer: Hammer,
  wrench: Wrench,
  ruler: Ruler,
  truck: Truck,
  umbrella: Umbrella,
  home: Home,
  homeUser: HomeUser,
  eye: Eye,
  clipboardCheck: ClipboardCheck,
  tools: Tools,
  warningTriangle: WarningTriangle,
  shield: Shield,
  chatLines: ChatLines,
  phone: Phone,
  mail: Mail,
  calendar: Calendar,
  clock: Clock,
  user: User,
  group: Group,
  lightBulb: LightBulb,
  leaf: Leaf,
  fireFlame: FireFlame,
  snow: Snow,
  cloudSunny: CloudSunny,
  mapPin: MapPin,
  sparks: Sparks,
  heart: Heart,
  helpCircle: HelpCircle,
  checkCircle: CheckCircle,
  badgeCheck: BadgeCheck,
};

export const getServiceIconComponent = (
  key: string | undefined,
): ComponentType<IconoirIconProps> => {
  if (!key) {
    return Search;
  }
  const normalized =
    LEGACY_SERVICE_ICON_ALIASES[key] ?? (key as ServiceIconKey);
  return SERVICE_ICONS[normalized] ?? Search;
};
