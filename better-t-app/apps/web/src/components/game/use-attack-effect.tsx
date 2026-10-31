import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { AttackEffect } from "./attack-effect";
import { type AttackEffectData, attackWindowFeatures, deliverAttackEffect, isEffectMessage, openAttackWindow } from "./attack-effect-data";

type Session = {
	popup: Window | null;
	token: string;
	effect: AttackEffectData | null;
	listener?: (event: MessageEvent) => void;
	poll?: number;
	deliveryTimeout?: number;
	finishing: boolean;
};

function dispose(session: Session) {
	if (session.poll !== undefined) window.clearInterval(session.poll);
	if (session.deliveryTimeout !== undefined) window.clearTimeout(session.deliveryTimeout);
	if (session.popup && session.listener) session.popup.removeEventListener("message", session.listener);
	if (session.popup && !session.popup.closed) session.popup.close();
}

function EffectDialog({ effect, onComplete }: { effect: AttackEffectData; onComplete: () => void }) {
	const ref = useRef<HTMLDialogElement>(null);
	useEffect(() => {
		ref.current?.showModal();
	}, []);
	return (
		<dialog className="m-auto max-h-[95vh] max-w-[95vw] bg-transparent p-0 backdrop:bg-black/75" onCancel={(event) => { event.preventDefault(); onComplete(); }} ref={ref}>
			<AttackEffect effect={effect} onComplete={onComplete} />
		</dialog>
	);
}

export function useAttackEffect(onFinished: () => Promise<void>) {
	const sessionRef = useRef<Session | null>(null);
	const finishedRef = useRef(onFinished);
	finishedRef.current = onFinished;
	const [busy, setBusy] = useState(false);
	const [display, setDisplay] = useState<{ popup: Window | null; effect: AttackEffectData } | null>(null);

	useEffect(() => () => {
		if (sessionRef.current) dispose(sessionRef.current);
		sessionRef.current = null;
	}, []);

	const fallback = (session: Session) => {
		if (sessionRef.current !== session || session.finishing) return;
		if (session.popup && session.listener) session.popup.removeEventListener("message", session.listener);
		if (session.popup && !session.popup.closed) session.popup.close();
		session.popup = null;
		if (session.poll !== undefined) window.clearInterval(session.poll);
		if (session.deliveryTimeout !== undefined) window.clearTimeout(session.deliveryTimeout);
		if (session.effect) setDisplay({ popup: null, effect: session.effect });
	};

	const begin = () => {
		if (sessionRef.current) return false;
		const token = Array.from(crypto.getRandomValues(new Uint32Array(4)), (value) => value.toString(16).padStart(8, "0")).join("");
		const popup = openAttackWindow(() => window.open("", "_blank", attackWindowFeatures(window.screen)));
		const session: Session = { popup, token, effect: null, finishing: false };
		sessionRef.current = session;
		setBusy(true);
		if (popup) {
			try {
				popup.document.title = "攻撃演出";
				for (const style of document.querySelectorAll('link[rel="stylesheet"], style')) {
					popup.document.head.appendChild(style.cloneNode(true));
				}
				popup.document.body.style.cssText = "margin:0;min-height:100vh;box-sizing:border-box;padding:16px;display:flex;align-items:center;justify-content:center;background:#080d1d;color:white";
				popup.document.body.textContent = "攻撃結果を待っています…";
				session.listener = (event) => {
					if (sessionRef.current !== session || !isEffectMessage(event, window.location.origin, window, session.token)) return;
					if (session.deliveryTimeout !== undefined) window.clearTimeout(session.deliveryTimeout);
					popup.document.body.textContent = "";
					setDisplay({ popup, effect: event.data.effect });
				};
				popup.addEventListener("message", session.listener);
				session.poll = window.setInterval(() => { if (popup.closed) fallback(session); }, 300);
			} catch {
				fallback(session);
			}
		}
		return true;
	};

	const publish = (effect: AttackEffectData) => {
		const session = sessionRef.current;
		if (!session || session.finishing) return;
		session.effect = effect;
		session.deliveryTimeout = window.setTimeout(() => fallback(session), 3000);
		deliverAttackEffect(session.popup, effect, session.token, window.location.origin, () => fallback(session));
	};

	const abort = () => {
		const session = sessionRef.current;
		if (!session) return;
		dispose(session);
		sessionRef.current = null;
		setDisplay(null);
		setBusy(false);
	};

	const complete = async () => {
		const session = sessionRef.current;
		if (!session || session.finishing) return;
		session.finishing = true;
		dispose(session);
		setDisplay(null);
		try {
			await finishedRef.current();
		} finally {
			if (sessionRef.current === session) {
				sessionRef.current = null;
				setBusy(false);
			}
		}
	};

	const element = display ? display.popup
		? createPortal(<AttackEffect effect={display.effect} onComplete={() => void complete()} />, display.popup.document.body)
		: <EffectDialog effect={display.effect} onComplete={() => void complete()} />
		: null;
	return { begin, publish, abort, busy, element };
}