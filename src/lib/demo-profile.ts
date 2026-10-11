import demoAvatar from "@/assets/demo/avatar.jpg";
import demoNewsletter from "@/assets/demo/newsletter.jpg";
import demoPortfolio from "@/assets/demo/portfolio.jpg";
import demoVideo from "@/assets/demo/video.jpg";
import demoZineCover from "@/assets/demo/zine-cover.jpg";
import type { Profile } from "./types";

export const DEMO_USERNAME = "demo";

// The built-in sample page at /demo. It needs no database, which also guarantees the profile
// route always has one page to prerender. Photo credits: src/assets/demo/CREDITS.md.
export const DEMO_PROFILE: Profile = {
  username: DEMO_USERNAME,
  displayName: "Mara Lindqvist",
  bio: "Designer, writer and weekend photographer. Everything I make, in one place.",
  avatar: demoAvatar,
  socials: [
    { platform: "instagram", url: "https://example.com/instagram" },
    { platform: "youtube", url: "https://example.com/youtube" },
    { platform: "tiktok", url: "https://example.com/tiktok" },
    { platform: "email", url: "mailto:hello@example.com" },
  ],
  links: [
    {
      id: "1",
      title: "New photo zine: Salt & Static",
      description: "Issue three, printed on recycled paper",
      url: "https://example.com/zine",
      icon: "shop",
      image: demoZineCover,
      featured: true,
    },
    {
      id: "2",
      title: "Latest video",
      description: "How I scan film at home",
      url: "https://example.com/video",
      icon: "video",
      image: demoVideo,
    },
    {
      id: "3",
      title: "Photo portfolio",
      description: "Selected work since 2019",
      url: "https://example.com/photos",
      icon: "camera",
      image: demoPortfolio,
    },
    {
      id: "4",
      title: "Join the newsletter",
      description: "One email a month",
      url: "https://example.com/newsletter",
      icon: "newsletter",
      image: demoNewsletter,
      size: "wide",
    },
    {
      id: "5",
      title: "Book a design call",
      description: "30 minutes over video",
      url: "https://example.com/book",
      icon: "calendar",
    },
    { id: "6", title: "My website", url: "https://example.com", icon: "website" },
  ],
};
