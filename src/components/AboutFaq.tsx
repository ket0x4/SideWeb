import {
	ChevronDown,
	ChevronUp,
	Cpu,
	HardDrive,
	HelpCircle,
	Lock,
	Zap,
} from "lucide-react";
import type React from "react";
import { useState } from "react";
import { Card } from "./ui/Card";

interface FaqItem {
	question: string;
	answer: React.ReactNode;
}

export const AboutFaq: React.FC = () => {
	const [openFaq, setOpenFaq] = useState<number | null>(0);

	const toggleFaq = (idx: number) => {
		setOpenFaq(openFaq === idx ? null : idx);
	};

	const faqList: FaqItem[] = [
		{
			question: "Does SideWeb store or upload my files to any cloud server?",
			answer: (
				<span>
					<strong>No, zero cloud uploads.</strong> SideWeb operates 100% locally
					inside your web browser using WebUSB. Your APK files, game OBBs, and
					device data never leave your local computer network or headset.
				</span>
			),
		},
		{
			question: "How do transfer speeds work? Why does performance vary?",
			answer: (
				<span>
					Because SideWeb processes file streams directly in your browser over
					USB,{" "}
					<strong>
						transfer performance depends entirely on your local device hardware,
						CPU speed, USB port version, and cable quality
					</strong>
					. For optimal transfer speeds:
					<ul className="mt-2 list-disc pl-5 space-y-1">
						<li>
							Use a high-speed USB 3.0 or USB 3.1 Type-C cable (avoid
							charging-only cables).
						</li>
						<li>
							Connect to a dedicated USB 3.0 SuperSpeed port on your PC or Mac.
						</li>
						<li>
							Close heavy background browser tabs during multi-gigabyte OBB
							transfers.
						</li>
					</ul>
				</span>
			),
		},
		{
			question: "How do I enable Developer Mode on Meta Quest 3?",
			answer: (
				<ol className="list-decimal pl-5 mt-1 space-y-1">
					<li>
						Log in to your Meta account on{" "}
						<code className="font-mono bg-elevated px-1 py-0.5 rounded">
							developer.oculus.com
						</code>{" "}
						and create an Organization name.
					</li>
					<li>
						Open the <strong>Meta Horizon mobile app</strong> on your phone.
					</li>
					<li>
						Go to{" "}
						<strong>
							Menu ➔ Devices ➔ Quest 3 ➔ Headset Settings ➔ Developer Mode
						</strong>{" "}
						and toggle it <strong>ON</strong>.
					</li>
					<li>
						Restart your Quest 3 headset, connect via USB, and accept the USB
						Debugging prompt inside VR.
					</li>
				</ol>
			),
		},
		{
			question:
				"Why does the browser ask where to save pulled OBB or ZIP files?",
			answer: (
				<span>
					SideWeb utilizes Chrome's{" "}
					<strong>Native File System Access API</strong> to stream
					multi-gigabyte files directly onto your hard drive. By writing bytes
					directly to disk instead of holding gigabytes in browser RAM, SideWeb
					prevents Chrome "Aw, Snap!" (Error Code 5) memory crashes.
				</span>
			),
		},
		{
			question: "Is it safe to uninstall Meta/Oculus system apps?",
			answer: (
				<span>
					<strong>Exercise caution.</strong> Sideloaded 3rd-party games can be
					safely uninstalled at any time. However, uninstalling core system
					components (packages starting with{" "}
					<code className="font-mono bg-elevated px-1 py-0.5 rounded">
						com.oculus.*
					</code>{" "}
					or{" "}
					<code className="font-mono bg-elevated px-1 py-0.5 rounded">
						com.meta.*
					</code>
					) can cause tracking issues, VR system instability, or require a
					factory reset.
				</span>
			),
		},
		{
			question: "What file formats are supported for sideloading?",
			answer: (
				<span>
					SideWeb supports single <strong>.apk</strong> files, split package
					bundles (<strong>.xapk</strong>, <strong>.apks</strong>), standalone{" "}
					<strong>.obb</strong> asset files, and zipped package archives
					containing both APK and OBB folders.
				</span>
			),
		},
		{
			question: "Which web browsers are supported by SideWeb?",
			answer: (
				<span>
					SideWeb requires the <strong>WebUSB API</strong> to communicate
					directly with your Meta Quest 3. WebUSB is exclusively supported in{" "}
					<strong>Chromium-based browsers</strong>:
					<ul className="mt-2 list-disc pl-5 space-y-1">
						<li>
							<strong>Supported:</strong> Google Chrome, Microsoft Edge, Brave,
							Opera, and Vivaldi (on Windows, macOS, Linux, ChromeOS, and
							Android).
						</li>
						<li>
							<strong>Unsupported:</strong> Mozilla Firefox, Apple Safari, and
							all iOS browsers (which use WebKit and lack WebUSB support).
						</li>
					</ul>
				</span>
			),
		},
	];

	return (
		<div className="space-y-4 sm:space-y-6">
			<Card className="bg-surface p-4 sm:p-6">
				<div className="flex items-center gap-3 mb-4">
					<div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-elevated border border-default flex items-center justify-center shrink-0">
						<Zap className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
					</div>
					<div>
						<h2 className="text-base sm:text-lg font-bold tracking-tight text-primary">
							About SideWeb
						</h2>
						<p className="text-xs text-muted">
							Client-side WebADB Quest 3 Sideloader & File Manager
						</p>
					</div>
				</div>

				<p className="text-xs text-secondary leading-relaxed mb-5">
					SideWeb is an ultra-fast, privacy-first web-based sideloader for Meta
					Quest 3 headsets. Built with React 19, Bun, TypeScript, and WebUSB, it
					enables seamless sideloading of games, APK split bundles, and
					multi-gigabyte OBB archives directly from your browser.
				</p>

				<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
					<div className="bg-card border border-subtle rounded-lg p-3.5 sm:p-4 space-y-1.5">
						<div className="flex items-center gap-2 text-emerald-500 font-semibold text-xs">
							<Lock className="w-4 h-4 shrink-0" />
							<span>100% Local & Privacy-First</span>
						</div>
						<p className="text-[11px] text-muted leading-relaxed">
							This application runs{" "}
							<strong>entirely inside your local browser session</strong>. No
							cloud servers, no file uploads, and no external tracking
							telemetry.
						</p>
					</div>

					<div className="bg-card border border-subtle rounded-lg p-3.5 sm:p-4 space-y-1.5">
						<div className="flex items-center gap-2 text-amber-500 font-semibold text-xs">
							<Cpu className="w-4 h-4 shrink-0" />
							<span>Hardware & USB Speed</span>
						</div>
						<p className="text-[11px] text-muted leading-relaxed">
							Sideloading speeds{" "}
							<strong>
								depend on your computer's CPU performance, USB port version, and
								cable quality
							</strong>
							. USB 3.0+ cables are recommended.
						</p>
					</div>

					<div className="bg-card border border-subtle rounded-lg p-3.5 sm:p-4 space-y-1.5 sm:col-span-2 md:col-span-1">
						<div className="flex items-center gap-2 text-blue-500 font-semibold text-xs">
							<HardDrive className="w-4 h-4 shrink-0" />
							<span>Zero-RAM Disk Streaming</span>
						</div>
						<p className="text-[11px] text-muted leading-relaxed">
							Utilizes Native File System Access API to stream multi-gigabyte
							OBB files straight to your hard disk without memory exhaustion.
						</p>
					</div>
				</div>
			</Card>

			<Card className="p-4 sm:p-6">
				<div className="flex items-center gap-2 mb-4 sm:mb-5">
					<HelpCircle className="w-4 h-4 text-cyan-400 shrink-0" />
					<h3 className="text-xs sm:text-sm font-semibold text-primary">
						Frequently Asked Questions (FAQ)
					</h3>
				</div>

				<div className="space-y-2.5 sm:space-y-3">
					{faqList.map((item, idx) => {
						const isOpen = openFaq === idx;
						return (
							<div
								key={item.question}
								className="bg-card border border-subtle rounded-lg overflow-hidden transition-colors duration-150"
							>
								<button
									type="button"
									onClick={() => toggleFaq(idx)}
									className="w-full p-3.5 sm:p-4 flex items-center justify-between text-left text-xs font-semibold text-primary hover:bg-elevated/50 transition-colors cursor-pointer"
								>
									<span className="pr-2">{item.question}</span>
									{isOpen ? (
										<ChevronUp className="w-4 h-4 text-muted shrink-0" />
									) : (
										<ChevronDown className="w-4 h-4 text-muted shrink-0" />
									)}
								</button>

								{isOpen && (
									<div className="px-3.5 sm:px-4 pb-3.5 sm:pb-4 pt-2.5 sm:pt-3 text-xs text-secondary leading-relaxed border-t border-dashed border-subtle">
										{item.answer}
									</div>
								)}
							</div>
						);
					})}
				</div>
			</Card>
		</div>
	);
};
