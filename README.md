# Better Robux Display

A Chromium extension that converts Robux amounts to USD on Roblox.com and displays the converted values alongside the original Robux amounts. The extension is customizable, allowing users to toggle the display of Robux and USD values, as well as hide the value entirely (for privacy).

## Features

- **Automatic Conversion**: Converts Robux values to USD using the devex conversion rate.
- **Customizable Display**: Users can choose to show or hide the Robux and USD values independently.
- **Easy to Use**: Simple toggle options are available in a popup accessible from the extension icon.
- **Private:** No data is sent or received by the plugin, so it is entirely private.
- **Robux Override:** Override how much robux it shows on your profile! Just a silly fun feature I thought I'd add while I was at it :)

## Installation on the Chrome Web Store

Just go to [the Chrome Web Store page](https://chromewebstore.google.com/detail/better-robux-display/fkpmkgjdhbojilghokdiheilcapgkbgn?authuser=0&hl=en) and add it to your browser!

## Installation via Git

1. Clone this repository to your local machine:

   ```bash
   git clone https://github.com/daireb/better-robux-display.git
   ```

   Or just manually download it.
2. Open your browser's extensions page and enable "Developer Mode"
3. Click "Load Unpacked" and select the downloaded file.
4. Enjoy!

## Building from source (TypeScript)

This repository now includes TypeScript sources in `src/` and a simple esbuild-based build.

1. Install dev deps:

   npm install

2. Build:

   npm run build

3. Load the extension in Chrome/Edge as the root folder containing `manifest.json` (the built files are output to `dist/`).

## Licence

This project is open source and available under the [MIT Licence](https://opensource.org/licenses/MIT). This means you can modify, distribute, or use the software even for commercial purposes, as long as you include the original licence and copyright notice in any copies of the software or substantial portions of it.

## Disclaimer

"Better Robux Display" is an independent project and is not affiliated with, authorized, endorsed by, or in any way officially connected with Roblox Corporation, or any of its subsidiaries or its affiliates. The official Roblox website can be found at https://www.roblox.com. The name "Roblox" as well as related names, marks, emblems, and images are registered trademarks of their respective owners.