/** Controls-only, nonpersistent preferences. No audio API is touched by rendering. */
export function soundControlsMarkup(enabled:boolean,volume:number):string{
 return `<section id="sound-controls" aria-labelledby="sound-title"><h3 id="sound-title">Optional sound textures</h3><p>Quiet stone steps, physical contact and operated mechanisms. No music or continuous ambience. Sound starts muted on every load.</p><div class="sound-settings"><button type="button" data-action="${enabled?'audio-mute':'audio-enable'}" aria-describedby="sound-status">${enabled?'Mute sound':'Enable sound'}</button><label for="sound-volume">Texture volume <output id="sound-volume-value" for="sound-volume">${Math.round(volume*100)}%</output></label><input id="sound-volume" type="range" min="0" max="35" step="1" value="${Math.round(volume*100)}" aria-describedby="sound-volume-help" /></div><p id="sound-volume-help">Low by default. Sound stays silent while menus are open.</p><p id="sound-status" role="status" aria-live="polite">${enabled?'Enabled — silent while menus are open.':'Muted. Enable only if you want sound.'}</p></section>`;
}

/** Preserve native editing/range keys instead of treating them as player movement. */
export function isNativeFormTarget(target:EventTarget|null):boolean{
 const element=target as HTMLElement|null;
 return !!element&&(element.isContentEditable||['INPUT','TEXTAREA','SELECT'].includes(element.tagName));
}
