export interface RepoConfig {
	id: string;
	name: string;
	baseUri: string;
	password?: string;
	lastSynced?: string;
	proxyUrl?: string;
}

export interface RepoGameInfo {
	id: string;
	name: string;
	releaseName: string;
	packageName: string;
	versionCode: string;
	size: string;
	sizeMb: number;
	lastUpdated: string;
	downloads?: number;
	md5Hash: string;
	hasThumbnail?: boolean;
	thumbnailUrl?: string;
	hasNote?: boolean;
	isInstalled?: boolean;
	installedVersionCode?: number;
	hasUpdate?: boolean;
	isNewerOnDevice?: boolean;
}

type RepoInstallStage =
	| "idle"
	| "downloading"
	| "extracting"
	| "pushing_apk"
	| "installing"
	| "pushing_obb"
	| "completed"
	| "error";

export interface RepoInstallProgress {
	stage: RepoInstallStage;
	percentage: number;
	statusText: string;
	error?: string;
	gameName: string;
	packageName: string;
}

type RepoUploadStage =
	| "idle"
	| "locating"
	| "pulling_apk"
	| "pulling_obb"
	| "packaging"
	| "uploading"
	| "completed"
	| "error";

export interface RepoUploadProgress {
	stage: RepoUploadStage;
	percentage: number;
	statusText: string;
	error?: string;
	gameName: string;
	packageName: string;
}
