import type * as Preset from "@docusaurus/preset-classic";
import type { Config } from "@docusaurus/types";
import { default as lunrSearch } from "docusaurus-lunr-search";
import { themes as prismThemes } from "prism-react-renderer";

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)
const config: Config = {
  title: "Configarr",
  tagline: "Simplified configuration management for your Arr applications like Sonarr, Radarr and more.",
  favicon: "img/favicon.ico",

  // Set the production url of your site here
  url: "https://configarr.raydak.de",
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: "/",

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: "raydak-labs", // Usually your GitHub org/user name.
  projectName: "configarr", // Usually your repo name.

  onBrokenLinks: "throw",
  onBrokenMarkdownLinks: "warn",

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },

  presets: [
    [
      "classic",
      {
        docs: {
          sidebarPath: "./sidebars.ts",
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl: "https://github.com/raydak-labs/configarr/tree/main/docs/",
        },
        blog: {
          showReadingTime: true,
          feedOptions: {
            type: ["rss", "atom"],
            xslt: true,
          },
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl: "https://github.com/raydak-labs/configarr/tree/main/docs/",
          // Useful options to enforce blogging best practices
          onInlineTags: "warn",
          onInlineAuthors: "warn",
          onUntruncatedBlogPosts: "warn",
        },
        theme: {
          customCss: "./src/css/custom.css",
        },
      } satisfies Preset.Options,
    ],
  ],

  plugins: [
    lunrSearch,
    () => ({
      name: "inject-tag",
      injectHtmlTags() {
        return {
          headTags: [
            `<script defer data-domain="configarr.raydak.de" src="https://plausible.raydak.de/js/script.file-downloads.hash.outbound-links.tagged-events.js"></script>
<script>window.plausible = window.plausible || function() { (window.plausible.q = window.plausible.q || []).push(arguments) }</script>
`,
          ],
        };
      },
    }),
  ],

  themeConfig: {
    // Replace with your project's social card
    image: "img/docusaurus-social-card.jpg",
    colorMode: {
      defaultMode: "dark",
    },
    metadata: [
      {
        name: "description",
        content: "Configarr - Simplify your configuration management for Arr applications like Sonarr, Radarr, Readarr, Lidarr.",
      },
      { name: "keywords", content: "configarr, configuration, management, automation, sonarr, radarr, lidarr, recyclarr, notifiarr" },
      { name: "robots", content: "index, follow" },
      { property: "og:title", content: "Configarr - Configuration Management Simplified" },
      {
        property: "og:description",
        content: "Easily manage and automate your configurations in Arr (Sonarr,Radarr,Lidarr,Readarr) with Configarr.",
      },
    ],
    navbar: {
      title: "Configarr",
      logo: {
        alt: "Configarr Logo",
        src: "img/logo.svg",
      },
      items: [
        {
          type: "docSidebar",
          sidebarId: "tutorialSidebar",
          position: "left",
          label: "Documentation",
        },
        // { to: "/blog", label: "Blog", position: "left" },
        {
          href: "https://github.com/raydak-labs/configarr",
          label: "GitHub",
          position: "right",
        },
      ],
    },
    footer: {
      style: "dark",
      links: [
        {
          title: "Docs",
          items: [
            {
              label: "Intro",
              to: "/docs/intro",
            },
          ],
        },
        {
          title: "Community",
          items: [
            {
              label: "German Discord (UsenetDE)",
              href: "https://discord.gg/Z2wTmrmFgn",
            },
            {
              label: "TRaSH-Guides",
              href: "https://trash-guides.info/",
            },
            // {
            //   label: "Discord",
            //   href: "https://discordapp.com/invite/docusaurus",
            // },
            // {
            //   label: "X",
            //   href: "https://x.com/docusaurus",
            // },
          ],
        },
        {
          title: "More",
          items: [
            // {
            //   label: "Blog",
            //   to: "/blog",
            // },
            {
              label: "GitHub",
              href: "https://github.com/raydak-labs/configarr",
            },
            {
              label: "Raydak",
              href: "https://raydak.de",
            },

            {
              label: "Stack Overflow",
              href: "https://stackoverflow.com/questions/tagged/configarr",
            },
            {
              label: "YouTube",
              href: "https://www.youtube.com/@raydak-labs",
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Configarr. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
