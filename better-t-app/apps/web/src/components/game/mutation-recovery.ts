export async function recoverMutationFailure(options: {
	error: Error & { data?: { code?: string } };
	refresh: () => Promise<void>;
	notify: (message: string, kind: "info" | "error") => void;
	attack?: boolean;
}): Promise<void> {
	// Attack presentation already refreshes in performAttack's failure handler.
	if (!options.attack) await options.refresh();
	if (options.error.data?.code === "STALE_MATCH_VERSION") {
		options.notify("対局の状態が更新されています。再取得後に操作してください。", "info");
	} else {
		options.notify(options.error.message, "error");
	}
}