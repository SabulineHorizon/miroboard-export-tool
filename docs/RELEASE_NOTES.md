# Miro Board Exporter v0.1.1

Licensing and packaging update. Adds the project MIT license, third-party
notices, and attribution to the download. Export functionality is unchanged.

## Download

Download **Miro-Board-Exporter-0.1.1-portable.exe** from **Assets** below and open it.
The build is for Windows 64-bit.

You'll need a Miro access token with **`boards:read`** permission.
See the [quick start and token setup](https://github.com/SabulineHorizon/miroboard-export-tool/blob/gui-v0.1.1/README.md#quick-start).

## Export notes

- The maintainer has tested standard `.tldr` export. Other formats are inherited
  from the original project and have not been manually tested in this fork.
- Conversion may change the layout or omit unsupported content. Review export
  warnings and check the result.
- Standard `.tldr` images use remote links and may require Miro access, even when
  image downloads are enabled.
- Matching filenames are overwritten. Choose a new folder to keep earlier exports.
- The executable is unsigned, so Windows may show an unrecognized-app warning.

`SHA256SUMS.txt` is available under **Assets** to verify the download.

## License

The project uses the [MIT License](https://github.com/SabulineHorizon/miroboard-export-tool/blob/gui-v0.1.1/LICENSE).
Third-party components retain their own licenses. `LICENSE` and
`THIRD_PARTY_NOTICES.txt` are bundled with the app and available under **Assets**.

Based on [essoen/miroboard-export-tool](https://github.com/essoen/miroboard-export-tool).
This fork's Windows GUI and accompanying changes were developed using OpenAI
Codex under the maintainer's direction.
