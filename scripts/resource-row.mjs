const esc=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');

// Match GPU Lab's outlined resource icons and quiet trailing disclosure control.
const paths={
 book:'<path d="M12 6c-3-2-6-2-9-1v14c3-1 6-1 9 1 3-2 6-2 9-1V5c-3-1-6-1-9 1Zm0 0v14"/>',
 cost:'<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8M8 11h2m4 0h2M8 15h2m4 0h2M8 18h2m4 0h2"/>',
 code:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Zm0 0v6h6M10 12l-3 3 3 3m4-6 3 3-3 3"/>',
 result:'<rect x="4" y="4" width="16" height="17" rx="2"/><path d="M9 4V2h6v2M8 13l3 3 5-6"/>',
 info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v.01"/>',
 tools:'<path d="M14 6a5 5 0 0 0-6 6L3 17a3 3 0 0 0 4 4l5-5a5 5 0 0 0 6-6l-3 3-4-4Z"/>',
 download:'<path d="M12 3v12m-5-5 5 5 5-5M5 16v4h14v-4"/>',
};

export function resourceSummary(title,{icon='book',description=''}={}){
 if(!paths[icon])throw Error('Unknown resource icon: '+icon);
 return `<summary class="resource-summary"><span class="resource-icon" data-resource-icon="${icon}" aria-hidden="true"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" focusable="false">${paths[icon]}</svg></span><span class="resource-copy"><strong>${esc(title)}</strong>${description?`<span class="resource-description">${esc(description)}</span>`:''}</span><svg class="resource-toggle" aria-hidden="true" focusable="false" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="m9 5 7 7-7 7"/></svg></summary>`;
}
