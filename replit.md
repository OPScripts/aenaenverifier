# Overview

This is a Discord bot application designed to verify guild membership for the AdventureQuest Worlds (AQW) game. The bot scrapes the AQW character page to validate that users belong to the CRUEL guild before granting them access roles on a Discord server. 

**Last Updated**: October 6, 2025

## Features
- `/verify-panel` slash command to create verification panels in specified channels
- `/verify-log` slash command to configure verification logging channel
- Interactive verification workflow with button clicks and modal forms
- Automatic web scraping of AQW character pages (searches for "cruel" text anywhere on page)
- Role management: assigns CRUEL member role (1422925879574794392) for verified guild members or guest role (1422925923526770849) for others
- Automatic nickname updates to match AQW username (with server owner exception handling)
- Verification logging system with detailed embeds showing verification results
- Comprehensive error handling with user-friendly messages

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Bot Framework
- **Technology**: Discord.js v14 with Gateway API
- **Intents**: Minimal permission set (Guilds and GuildMembers only) to reduce attack surface and comply with Discord's privileged intent requirements
- **Rationale**: Discord.js is the most mature and well-documented Node.js library for Discord bot development, providing robust event handling and slash command support

## Verification Flow
- **Web Scraping Approach**: Direct HTTP requests to AQW character pages using Axios + Cheerio
- **Problem Addressed**: No official AQW API exists for guild verification
- **Implementation**: Simple text search that looks for "cruel" (case-insensitive) anywhere on the character page HTML
- **Error Handling**: Includes timeout protection (10s), 404 detection, and User-Agent spoofing to prevent blocking

## Role Management
- **Architecture**: Hardcoded role IDs for two-tier access system
  - `CRUEL_MEMBER_ROLE_ID` (1422925879574794392): Full member access for verified CRUEL guild members
  - `GUEST_ROLE_ID` (1422925923526770849): Limited access for non-guild members or failed verification
- **Mutual Exclusivity**: Roles are mutually exclusive - the bot removes one role before assigning the other to prevent users from having both
- **Duplicate Prevention**: Bot checks if user already has the target role before adding to avoid redundant operations
- **Nickname Management**: Bot automatically changes user's Discord nickname to match their AQW username, with special handling for server owners (Discord API limitation)
- **Trade-offs**: Hardcoding provides simplicity but requires code changes for different servers; suitable for single-guild deployment

## Verification Logging
- **Configuration**: Administrators use `/verify-log` command to set logging channel
- **Log Format**: Rich embeds with color-coding (green for CRUEL members, red for guests)
- **Information Captured**: User mention, AQW username, assigned role, timestamp
- **Storage**: Channel ID stored in memory (resets on bot restart)
- **Purpose**: Provides audit trail of all verification attempts for server moderation

## Interaction Model
- **Expected Pattern**: Slash commands with modal forms and button interactions
- **Rationale**: Modern Discord UI pattern that provides better UX than text commands and supports complex input validation
- **Components Used**: EmbedBuilder (rich messages), ModalBuilder (input forms), ButtonBuilder (interactive elements), ActionRowBuilder (component layout)

## Security Considerations
- **Bot Permissions**: Limited to PermissionFlagsBits scope to prevent privilege escalation
- **Input Validation**: Username encoding via `encodeURIComponent()` to prevent injection attacks
- **Rate Limiting**: Implicit through Discord's built-in rate limiting; external scraping includes timeout protection

# External Dependencies

## Third-Party Services
- **AQW Character Pages** (`account.aq.com/CharPage`): Primary data source for guild verification
  - No authentication required
  - HTML parsing-based integration (fragile, subject to breaking on UI changes)
  - Includes User-Agent spoofing to mimic browser requests

## Discord Platform
- **Discord Gateway API**: Real-time event streaming for bot interactions
- **Slash Commands API**: Modern command registration and handling system
- **Required Scopes**: Guilds intent, GuildMembers intent (privileged)

## NPM Packages
- **discord.js** (v14.22.1): Core Discord bot framework with full API coverage
- **axios** (v1.12.2): HTTP client for web scraping with timeout and header support
- **cheerio** (v1.1.2): Server-side jQuery implementation for HTML parsing

## Runtime Environment
- **Node.js**: Minimum version 16.11.0 (required by discord.js)
- **Environment Variables**: Bot token expected (implementation details not visible in provided code)