# Epub Importer

Import .epub file into Obsidian as markdown notes.

## ⚙️ Usage

## 📥 Installation

- [ ] From Obsidian's community plugins
- [x] Using BRAT with `https://github.com//epub-importer`
- [x] From the release page:
- Download the latest release
- Unzip `epub-importer.zip` in `.obsidian/plugins/` path
- In Obsidian settings, reload the plugin
- Enable the plugin

## 🤖 Developing

To make changes to this plugin, first ensure you have the dependencies installed.

```
npm install
```

To start building the plugin with what mode enabled run the following command:

```
npm run dev
```

> **Note**
> If you haven't already installed the hot-reload-plugin you'll be prompted to. You need to enable that plugin in your obsidian vault before hot-reloading will start. You might need to refresh your plugin list for it to show up.
> To start a release build run the following command:

```
npm run build
```

> **Note**
> You can use the `.env` file with adding the key `VAULT_DEV` to specify the path to your Obsidian (development) vault. This will allow you to test your plugin without specify each times the path to the vault.

### 📤 Export

You can use the `npm run export` command to export your plugin to your Obsidian Main Vault. To do that, you need the `.env` file with the following content:

```env
VAULT="path/to/your/obsidian/vault"
VAULT_DEV="path/to/your/dev/vault"
```

### 🎼 Languages

- [x] English
- [ ] French
      To add a translation:
- Fork the repository
- Add the translation in the `src/i18n/locales` folder with the name of the language (ex: `fr.json`)
- Copy the content of the [`en.json`](./src/i18n/locales/en.json) file in the new file
- Translate the content
- Create a pull request

---

<sub>This plugin was generated by <a href="https://www.npmjs.com/package/@lisandra-dev/create-obsidian-plugin">create-obsidian-plugin</a></sub>
