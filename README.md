<h1 align="center">docudigger - ARCHIVED</h1>

> **This project has been archived and is no longer maintained.**
> 
> **The successor is [Scrape Dojo](https://github.com/Disane87/scrape-dojo) — a much more powerful, flexible, and feature-rich web scraping platform.**

---

## Why Scrape Dojo?

Scrape Dojo is the next evolution of docudigger. While docudigger was limited to Amazon invoice scraping, Scrape Dojo is a full-featured, self-hosted web scraping & browser automation platform.

### Key Features of Scrape Dojo

- **Declarative JSON/JSONC Workflows** — Define scrapes as code, no more writing Puppeteer scripts manually
- **25+ Built-in Actions** — Navigate, click, type, extract, loop, download, screenshot, and more
- **Universal Scraping** — Not limited to Amazon; scrape any website with customizable workflows
- **Cron Scheduling & Webhooks** — Automate scrapes with cron patterns, webhooks, or startup triggers
- **Handlebars + JSONata Templates** — Dynamic templates and powerful data transformations
- **Encrypted Secrets** — AES-256-CBC at-rest encryption for credentials
- **Real-time Monitoring** — SSE-powered live execution tracking with a modern Angular UI
- **Authentication & SSO** — JWT, OIDC/SSO, MFA/TOTP, API keys
- **Multi-Database Support** — SQLite (default), MySQL, PostgreSQL
- **Docker-Ready** — Easy deployment with Docker Compose
- **Modern Tech Stack** — Built with NestJS, Angular, Puppeteer, TypeScript, and Nx

### Get Started with Scrape Dojo

```bash
docker compose up -d
```

Full documentation: [scrape-dojo.com](https://scrape-dojo.com)

---

## Original Project

docudigger was a document scraper for getting invoices automatically as PDF (useful for taxes or DMS). It supported Amazon invoice scraping via CLI or Docker.

## Author

**Marco Franke**

- Website: http://byte-style.de
- Github: [@Disane87](https://github.com/Disane87)
- LinkedIn: [@marco-franke-799399136](https://linkedin.com/in/marco-franke-799399136)

## License

MIT
