/* eslint-disable no-mixed-spaces-and-tabs */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-unused-vars */
import {
	Plugin,
	TFile,
	WorkspaceLeaf,
	htmlToMarkdown,
	parseYaml,
	stringifyYaml,
} from "obsidian";
import { Chapter, EpubParser } from "./lib/EpubParser";
import { EpubImporterModal } from "./modal";
import { NoteParser } from "./lib/NoteParser";
import { DEFAULT_SETTINGS, EpubImporterSettings } from "./settings/settings";
import { EpubImporterSettingsTab } from "./settings/settingsTab";

import jetpack from "fs-jetpack";
import { getNotesWithTag } from "./utils/obsidianUtils";
import { Path } from "./utils/path";

export default class EpubImporterPlugin extends Plugin {
	vaultPath: string;
	settings: EpubImporterSettings;
	parser: EpubParser;
	BookNote: string;
	assetsPath:string;
	propertys: any;
	activeBook: string;
	activeLeaf: WorkspaceLeaf;
	async onload() {
		//@ts-ignore
		this.vaultPath = this.app.vault.adapter.basePath;
		await this.loadSettings();
		this.addSettingTab(new EpubImporterSettingsTab(this.app, this));
		this.addCommand({
			id: "import-epub",
			name: "Import epub to your vault",
			callback: () => {
				new EpubImporterModal(this.app, this, async (result) => {
					await this.import(result);
				}).open();
			},
		});
		this.addCommand({
			id: "sync-librarys",
			name: "Import all epub from librarys to your vault",
			callback: async () => {
				for(let i=0;i<this.settings.librarys.length;i++){
					const results = jetpack.find(this.settings.librarys[i],{matching:"**/**.epub"});
					for(let j=0;j<results.length;j++){
						await this.import(jetpack.path(results[j]));
					}
				}
			},
		});

		this.registerEvent( this.app.workspace.on("file-open", (file) => {
			if (!this.settings.autoOpenRightPanel) return;
			const bookNotePath = this.findBookNote(new Path(file.path));
			if (!bookNotePath) return this.activeLeaf.detach();
			const bookName = bookNotePath.split("/")[bookNotePath.split("/").length -2];
			if (this.activeBook == bookName) return;
			if (this.activeLeaf) this.activeLeaf.detach();
			this.activeBook = bookName;
			this.activeLeaf = this.app.workspace.getRightLeaf(false);
			this.activeLeaf.setViewState({
				type: "markdown",
				state: {
					file: bookNotePath,
					mode: "preview",
					backlinks: false,
					source: false,
				},
			});
			this.activeLeaf.setPinned(true);
			this.app.workspace.revealLeaf(this.activeLeaf);
		}));
		
		this.registerEvent( this.app.workspace.on("quit", () => {
			this.activeLeaf.detach();
		}));

		this.registerEvent(this.app.workspace.on("file-open", () => {
			if (!this.settings.allbooks) return;
			const files_with_tag = getNotesWithTag(this.app,this.settings.tag);
			const allBooks = this.app.vault.getAbstractFileByPath("AllBooks.md");
			if (allBooks && allBooks instanceof TFile) {
				this.app.vault.modify(
					allBooks,
					files_with_tag
						.map((file) => `- [[${file.path}|${file.parent?.name}]]`)
						.join("\n")
				);
			} else {
				this.app.vault.create(
					"AllBooks.md",
					files_with_tag
						.map((file) => `[[${file.path}|${file.parent?.name}]]`)
						.join("\n")
				);
			}
		}));
	}
	onunload() {
		this.activeLeaf.detach();
	}

	async loadSettings(): Promise<void> {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}

	async import(epubPath: string) {
		this.parser = new EpubParser(epubPath);
		await this.parser.init();
		this.BookNote = "";
		const epubName = new Path(epubPath).stem;
		this.assetsPath = this.settings.assetsPath.replace("{{bookName}}",epubName).replace("{{savePath}}",this.settings.savePath);
		let defaultPropertys = this.settings.propertysTemplate.replace("{{bookName}}",epubName);

		this.parser.meta.forEach((value,key)=>{
			defaultPropertys = defaultPropertys.replace("{{"+key+"}}",value);
		});
		this.propertys = parseYaml(defaultPropertys);
		await this.app.vault.createFolder(Path.join(this.settings.savePath,epubName,"/"));

		this.copyImages();
		this.propertys.tags = (this.propertys.tags?this.propertys.tags:[]).concat([this.settings.tag]);

		if(this.settings.granularity!=0){
			for(let i=0;i<this.parser.chapters.length;i++){
				await this.Chapter2MD(
					epubName,
					this.parser.chapters[i],
					new Path(this.settings.savePath,epubName,this.parser.chapters[i].name,"/"),
					[i+1]
				);
			}
			this.BookNote = "---\n" + stringifyYaml(this.propertys) + "\n---\n" + this.BookNote;
			await this.app.vault.create(Path.join(this.settings.savePath,epubName,epubName+".md","/"), this.BookNote);
		}else{
			let content = "";
			const Chapter2MD2 = (chapter:Chapter)=>{
				let content2 = htmlToMarkdown(chapter.html?chapter.html:"");
				if(chapter.html && !content2){
					content2 = chapter.html.replace(/<[^>]+>/g, "");
				}
				content += "\n\n" + NoteParser.getParseredNote(
					content2,
					epubName,
					this.assetsPath
				);
				chapter.subItems.forEach(Chapter2MD2);
			};
			this.parser.chapters.forEach(Chapter2MD2);
			content = "---\n" + stringifyYaml(this.propertys) + "\n---\n" + content;
			this.app.vault.create(
				Path.join(this.settings.savePath,epubName,epubName+".md","/"),
				content
			);
		}

		
		
		jetpack.remove(this.parser.tmpPath);
	}

	copyImages() {
		const imagesPath = new Path("/",this.vaultPath,this.assetsPath);
		jetpack.find(
			this.parser.tmpPath,
			{matching: ["*.jpg", "*.jpeg", "*.png"]}
		).forEach((file)=>{
			jetpack.copy(file,imagesPath.join(new Path(file).name).string,{overwrite:true});
		});
		if(this.parser.coverPath){
			this.propertys.cover = new Path(
				this.assetsPath,
				new Path(this.parser.coverPath).name
			).string;
		}
		
	}

	async Chapter2MD(epubName: string, cpt: Chapter, notePath: Path, serialNumber:number[]) {
		if(this.settings.serialNumber){
			let lastOne = notePath.data.pop();
			const serialNumber2 = [...serialNumber];
			serialNumber2[0] = serialNumber2[0] - this.settings.serialNumberDelta;
			if(serialNumber2[0]>=1){
				lastOne = serialNumber2.join(".") +" "+ lastOne;
			}
			notePath.data.push(lastOne);
		}
		const restricted = serialNumber.length > this.settings.granularity?1:0;
		const extend = (cpt.subItems.length && serialNumber.length < this.settings.granularity)?1:0;
		const noteName = notePath.name;
		const folderPath = notePath;
		if(extend){
			await this.app.vault.createFolder(notePath.string);
			notePath = notePath.join(noteName);
		}

		let content2 = htmlToMarkdown(cpt.html?cpt.html:"");
		if(cpt.html && !content2){
			content2 = cpt.html.replace(/<[^>]+>/g, "");
		}
		const content = NoteParser.getParseredNote(
			content2,
			epubName,
			this.assetsPath
		);
		if(!restricted){

			
			if(! this.app.vault.getAbstractFileByPath(notePath.withSuffix("md",true).string)){
				await this.app.vault.create(
					notePath.withSuffix("md",true).string,
					content
				);
				this.BookNote += `${"\t".repeat(serialNumber.length-1)}- [[${notePath.string.replace(
					/\\/g,
					"/"
				)}|${noteName}]]\n`;
			}
			
		}else{
			let parentPath = notePath;
			const delta = serialNumber.length - this.settings.granularity;
			parentPath = parentPath.getParent(delta);
			const parentFile = this.app.vault.getAbstractFileByPath(parentPath.withSuffix("md").string) as TFile;
			await this.app.vault.process(parentFile,(data)=>{
				return data + "\n\n" + content;
			});
		}
		
		for(let i=0;i<cpt.subItems.length;i++){
			const item = cpt.subItems[i];
			await this.Chapter2MD(
				epubName,
				item,
				folderPath.join(item.name),
				serialNumber.concat([i+1])
			);
		}
	}

	findBookNote(notePath: Path):string {
		const epubName = notePath.getParent(
			notePath.length - new Path(this.settings.savePath).length - 1
		).name;

		const bookNotePath = new Path(this.settings.savePath).join(epubName,epubName+".md").string;
		const bookNote = this.app.vault.getAbstractFileByPath(bookNotePath);
		if (!bookNote) return;
		return bookNotePath;
	}
}
