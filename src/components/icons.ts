// Phosphor's server-safe icons, imported one file at a time so compiles skip the full
// icon barrel. They render plain <svg> and add no client JavaScript.
import type { Icon } from "@phosphor-icons/react";
import { CalendarBlankIcon } from "@phosphor-icons/react/dist/ssr/CalendarBlank";
import { CameraIcon } from "@phosphor-icons/react/dist/ssr/Camera";
import { EnvelopeSimpleIcon } from "@phosphor-icons/react/dist/ssr/EnvelopeSimple";
import { GithubLogoIcon } from "@phosphor-icons/react/dist/ssr/GithubLogo";
import { GlobeSimpleIcon } from "@phosphor-icons/react/dist/ssr/GlobeSimple";
import { InstagramLogoIcon } from "@phosphor-icons/react/dist/ssr/InstagramLogo";
import { LinkedinLogoIcon } from "@phosphor-icons/react/dist/ssr/LinkedinLogo";
import { MapPinIcon } from "@phosphor-icons/react/dist/ssr/MapPin";
import { MicrophoneIcon } from "@phosphor-icons/react/dist/ssr/Microphone";
import { MusicNotesIcon } from "@phosphor-icons/react/dist/ssr/MusicNotes";
import { NewspaperIcon } from "@phosphor-icons/react/dist/ssr/Newspaper";
import { PlayCircleIcon } from "@phosphor-icons/react/dist/ssr/PlayCircle";
import { ShoppingBagIcon } from "@phosphor-icons/react/dist/ssr/ShoppingBag";
import { SpotifyLogoIcon } from "@phosphor-icons/react/dist/ssr/SpotifyLogo";
import { ThreadsLogoIcon } from "@phosphor-icons/react/dist/ssr/ThreadsLogo";
import { TiktokLogoIcon } from "@phosphor-icons/react/dist/ssr/TiktokLogo";
import { XLogoIcon } from "@phosphor-icons/react/dist/ssr/XLogo";
import { YoutubeLogoIcon } from "@phosphor-icons/react/dist/ssr/YoutubeLogo";
import type { LinkIcon, SocialPlatform } from "@/lib/types";

export { ArrowDownIcon } from "@phosphor-icons/react/dist/ssr/ArrowDown";
export { ArrowLeftIcon } from "@phosphor-icons/react/dist/ssr/ArrowLeft";
export { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowRight";
export { ArrowUpIcon } from "@phosphor-icons/react/dist/ssr/ArrowUp";
export { ArrowUpRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowUpRight";
export { ArrowsOutIcon } from "@phosphor-icons/react/dist/ssr/ArrowsOut";
export { CheckCircleIcon } from "@phosphor-icons/react/dist/ssr/CheckCircle";
export { ClockIcon } from "@phosphor-icons/react/dist/ssr/Clock";
export { CopyIcon } from "@phosphor-icons/react/dist/ssr/Copy";
export { DownloadSimpleIcon } from "@phosphor-icons/react/dist/ssr/DownloadSimple";
export { GlobeIcon } from "@phosphor-icons/react/dist/ssr/Globe";
export { GoogleLogoIcon } from "@phosphor-icons/react/dist/ssr/GoogleLogo";
export { ImageSquareIcon } from "@phosphor-icons/react/dist/ssr/ImageSquare";
export { LightningIcon } from "@phosphor-icons/react/dist/ssr/Lightning";
export { PlayIcon } from "@phosphor-icons/react/dist/ssr/Play";
export { PlusIcon } from "@phosphor-icons/react/dist/ssr/Plus";
export { SignOutIcon } from "@phosphor-icons/react/dist/ssr/SignOut";
export { TrashIcon } from "@phosphor-icons/react/dist/ssr/Trash";
export { WarningCircleIcon } from "@phosphor-icons/react/dist/ssr/WarningCircle";
export { EnvelopeSimpleIcon, MapPinIcon, SpotifyLogoIcon, YoutubeLogoIcon };

export const SOCIAL_PLATFORMS: Record<SocialPlatform, { label: string; Icon: Icon }> = {
  instagram: { label: "Instagram", Icon: InstagramLogoIcon },
  tiktok: { label: "TikTok", Icon: TiktokLogoIcon },
  youtube: { label: "YouTube", Icon: YoutubeLogoIcon },
  x: { label: "X", Icon: XLogoIcon },
  threads: { label: "Threads", Icon: ThreadsLogoIcon },
  github: { label: "GitHub", Icon: GithubLogoIcon },
  linkedin: { label: "LinkedIn", Icon: LinkedinLogoIcon },
  spotify: { label: "Spotify", Icon: SpotifyLogoIcon },
  email: { label: "Email", Icon: EnvelopeSimpleIcon },
};

export const LINK_ICONS: Record<LinkIcon, Icon> = {
  video: PlayCircleIcon,
  camera: CameraIcon,
  shop: ShoppingBagIcon,
  newsletter: NewspaperIcon,
  calendar: CalendarBlankIcon,
  music: MusicNotesIcon,
  podcast: MicrophoneIcon,
  website: GlobeSimpleIcon,
  map: MapPinIcon,
};
