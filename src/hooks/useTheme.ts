import { useCallback, useEffect, useState } from "react";

type ThemeMode = "system" | "dark" | "light";

export function useTheme() {
	const [theme, setThemeState] = useState<ThemeMode>(() => {
		const saved = localStorage.getItem("sideweb_theme");
		if (saved === "dark" || saved === "light" || saved === "system") {
			return saved;
		}
		return "system";
	});

	const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(() => {
		if (typeof window !== "undefined" && window.matchMedia) {
			return window.matchMedia("(prefers-color-scheme: dark)").matches;
		}
		return true;
	});

	useEffect(() => {
		if (typeof window === "undefined" || !window.matchMedia) return;
		const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
		const handleChange = (e: MediaQueryListEvent) => {
			setSystemPrefersDark(e.matches);
		};
		mediaQuery.addEventListener("change", handleChange);
		return () => mediaQuery.removeEventListener("change", handleChange);
	}, []);

	const effectiveTheme: "dark" | "light" =
		theme === "system" ? (systemPrefersDark ? "dark" : "light") : theme;

	useEffect(() => {
		document.documentElement.setAttribute("data-theme", effectiveTheme);
		localStorage.setItem("sideweb_theme", theme);
	}, [theme, effectiveTheme]);

	const toggleTheme = useCallback(() => {
		setThemeState((prev) => {
			if (prev === "system") return "dark";
			if (prev === "dark") return "light";
			return "system";
		});
	}, []);

	return {
		theme,
		effectiveTheme,
		toggleTheme,
	};
}
