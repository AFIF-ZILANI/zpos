type SoundKey = "beep" | "dual_beep" | "error_beep";

const cache = new Map<SoundKey, HTMLAudioElement>();

function getAudio(key: SoundKey): HTMLAudioElement {
    if (!cache.has(key)) {
        cache.set(key, new Audio(`/sounds/${key}.wav`));
    }
    return cache.get(key)!;
}

export function playSoundWithCacheInstance(key: SoundKey): void {
    const audio = getAudio(key);
    audio.currentTime = 0;
    audio.play().catch(() => { });
}
export function playSoundWithFreshInstance(key: SoundKey): void {
    const audio = getAudio(key);
    (audio.cloneNode() as HTMLAudioElement).play().catch(() => { });
}
