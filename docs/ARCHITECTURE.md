# Pages

```plaintext
/                → Home (ASCII logo + intro + quick links)
/projects        → Projects gallery
/projects/:slug  → In-depth info and links to projects
/blog            → Blog index
/blog/:slug      → Individual blog post
/resume          → CV / résumé (printable)
/links           → Social links & contact
/uses            → Tools, gear, setup (optional)
```

# Navigation

Navigation is rendered as a shell prompt breadcrumb at the top of every page, serving as the page title:
```bash
guest@lsalik:~$ cd /projects
```

# Content 

All content (blog posts, project descriptions, resume entries) is authored in **Markdown files** that are compiled at build time. This keeps the repo simple and the editing workflow familiar.
