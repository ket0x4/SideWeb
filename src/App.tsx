import type React from "react";
import { useState } from "react";
import { AboutFaq } from "./components/AboutFaq";
import { AppManager } from "./components/AppManager";
import { ConnectionTroubleshooter } from "./components/ConnectionTroubleshooter";
import { BrowserWarningBanner } from "./components/common/BrowserWarningBanner";
import { Header } from "./components/Header";
import { LogViewer } from "./components/LogViewer";
import { ObbExplorer } from "./components/ObbExplorer";
import { RepoManager } from "./components/repo/RepoManager";
import { SideloadZone } from "./components/SideloadZone";
import { Terminal } from "./components/Terminal";
import { useAdb } from "./hooks/useAdb";
import { useTheme } from "./hooks/useTheme";
import { detectBrowser } from "./utils/browserDetection";
import "./styles/theme.css";

const App: React.FC = () => {
	const { theme, effectiveTheme, toggleTheme } = useTheme();
	const {
		status,
		deviceInfo,
		logs,
		installedApps,
		obbFolders,
		isLoadingApps,
		isLoadingObb,
		showSystemApps,
		connect,
		disconnect,
		clearLogs,
		refreshDeviceInfo,
		refreshApps,
		refreshObbFolders,
		toggleShowSystemApps,
		cancelCurrentOperation,
		pullAppApk,
		pullObbFile,
		pullObbFolderAsZip,
		installPackage,
		uninstallApp,
		launchApp,
		deleteObbFolder,
		runShellCommand,
	} = useAdb();

	const [activeTab, setActiveTab] = useState<
		"sideload" | "apps" | "obb" | "terminal" | "repo" | "faq"
	>("sideload");
	const [logsOpen, setLogsOpen] = useState(false);
	const [showTroubleshooter, setShowTroubleshooter] = useState(false);
	const [browserWarningDismissed, setBrowserWarningDismissed] = useState(false);

	const browserInfo = detectBrowser();
	const isUnsupportedBrowser =
		!browserInfo.isChromium || !browserInfo.isWebUsbSupported;

	const isTroubleshootNeeded =
		status === "unauthorized" || status === "error" || showTroubleshooter;

	return (
		<div className="min-h-screen bg-page text-primary transition-colors duration-200">
			<Header
				status={status}
				deviceInfo={deviceInfo}
				activeTab={activeTab}
				setActiveTab={setActiveTab}
				onConnect={connect}
				onDisconnect={disconnect}
				onRefreshDeviceInfo={refreshDeviceInfo}
				logsCount={logs.length}
				onToggleLogs={() => setLogsOpen((prev) => !prev)}
				theme={theme}
				effectiveTheme={effectiveTheme}
				onToggleTheme={toggleTheme}
				onOpenTroubleshooter={() => setShowTroubleshooter(true)}
			/>

			<main className="max-w-6xl mx-auto px-3.5 sm:px-6 pt-4 sm:pt-8 pb-28">
				{isUnsupportedBrowser && !browserWarningDismissed && (
					<BrowserWarningBanner
						browserInfo={browserInfo}
						onOpenTroubleshooter={() => setShowTroubleshooter(true)}
						onDismiss={() => setBrowserWarningDismissed(true)}
						className="mb-4 sm:mb-6"
					/>
				)}

				{isTroubleshootNeeded && (
					<ConnectionTroubleshooter
						status={status}
						onRetry={connect}
						onClose={() => setShowTroubleshooter(false)}
					/>
				)}

				{activeTab === "sideload" && (
					<SideloadZone
						isConnected={status === "connected"}
						onInstall={installPackage}
						onCancel={cancelCurrentOperation}
					/>
				)}

				{activeTab === "repo" && (
					<RepoManager
						isConnected={status === "connected"}
						installedApps={installedApps}
					/>
				)}

				{activeTab === "apps" && (
					<AppManager
						isConnected={status === "connected"}
						installedApps={installedApps}
						isLoading={isLoadingApps}
						showSystemApps={showSystemApps}
						onRefresh={refreshApps}
						onToggleSystemApps={toggleShowSystemApps}
						onUninstall={uninstallApp}
						onLaunch={launchApp}
						onPullApk={pullAppApk}
					/>
				)}

				{activeTab === "obb" && (
					<ObbExplorer
						isConnected={status === "connected"}
						obbFolders={obbFolders}
						isLoading={isLoadingObb}
						onRefresh={refreshObbFolders}
						onDeleteFolder={deleteObbFolder}
						onPullObbFile={pullObbFile}
						onPullObbFolderAsZip={pullObbFolderAsZip}
						onCancel={cancelCurrentOperation}
					/>
				)}

				{activeTab === "terminal" && (
					<Terminal
						isConnected={status === "connected"}
						onRunShell={runShellCommand}
						deviceModel={deviceInfo?.model}
					/>
				)}

				{activeTab === "faq" && <AboutFaq />}
			</main>

			<LogViewer
				logs={logs}
				isOpen={logsOpen}
				onToggle={() => setLogsOpen((prev) => !prev)}
				onClear={clearLogs}
			/>
		</div>
	);
};

export default App;
