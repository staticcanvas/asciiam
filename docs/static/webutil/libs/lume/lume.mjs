/*! lume v0.36.3 | https://staticcanvas.gitlab.io/lume | MIT */
var t=Object.defineProperty,e=Object.getOwnPropertySymbols,i=Object.prototype.hasOwnProperty,o=Object.prototype.propertyIsEnumerable,n=(e,i,o)=>i in e?t(e,i,{enumerable:!0,configurable:!0,writable:!0,value:o}):e[i]=o;
/**
 * @fileoverview Lume Tooltip Engine - Lightweight, zero-dependency contextual tooltip engine.
 * @module @staticcanvas/lume
 * @license MIT
 */
let s=0;class l{
/**
   * Initializes a new Lume tooltip instance.
   * @param {LumeOptions} [options={}] - Configuration options for Lume.
   * @param {string} [options.selector='[data-lume], [data-lume-content]'] - Target attribute or selector for auto-initialization.
   * @param {number} [options.offset=14] - Distance in pixels between target element and tooltip.
   * @param {boolean} [options.smart=true] - Enables collision detection; `data-lume-direction="auto"` chooses the side with the most room.
   * @param {Array<'top'|'bottom'|'left'|'right'>} [options.priority] - Ordered sides preferred by automatic placement.
   * @param {string} [options.className=''] - Custom CSS class appended to tooltip element.
   * @param {'minimal'|'simple'|'advanced'} [options.tier='simple'] - Tooltip density tier.
   * @param {'fade'|'lift'|'scale'|'slide'|'pop'|'blur'|'bounce'|'swing'|'flip'|'none'} [options.motion='fade'] - Visual motion preset.
   * @param {string} [options.icon=''] - Optional application-owned SVG URL or `info` icon shown before the tooltip title.
   * @param {string} [options.dot=''] - Optional CSS color for a circular status dot.
   * @param {'left'|'right'|'top'|'bottom'} [options.dotPosition='left'] - Position of the status dot.
   * @param {'left'|'center'|'right'} [options.align='center'] - Horizontal alignment for top and bottom tooltip placement.
   * @param {'hover'|'click'} [options.action='hover'] - Trigger interaction model. Click mode supports mouse, touch, and keyboard activation.
   * @param {number} [options.motionIntensity=1] - Scales the strength of the selected motion preset from 0 to 3.
   * @param {number} [options.showDelay=0] - Delay in milliseconds before showing a tooltip.
   * @param {number} [options.hideDelay=0] - Delay in milliseconds before hiding a tooltip.
   * @param {boolean} [options.allowHTML=false] - Render trusted data-lume-content as HTML when explicitly enabled.
   * @param {HTMLElement} [options.container] - DOM element to append tooltip to (defaults to document.body).
   * @param {HTMLElement} [options.boundary] - Element whose visible bounds constrain the tooltip.
   * @param {number} [options.padding=10] - Minimum distance from the positioning boundary.
   * @param {boolean} [options.autoInit=true] - Automatically bind matching elements and observe DOM mutations.
   * @param {boolean} [options.observeMutations=true] - Automatically bind matching elements added after initialization.
   */
constructor(t={}){this.options=((t,s)=>{for(var l in s||(s={}))i.call(s,l)&&n(t,l,s[l]);if(e)for(var l of e(s))o.call(s,l)&&n(t,l,s[l]);return t})({selector:"[data-lume], [data-lume-content]",offset:14,smart:!0,priority:["top","bottom","right","left"],className:"",tier:"simple",dot:"",dotPosition:"left",motion:"fade",icon:"",align:"center",action:"hover",motionIntensity:1,showDelay:0,hideDelay:0,allowHTML:!1,container:null,boundary:null,padding:10,autoInit:!0,observeMutations:!0},t),this._validateOptions(),this.tooltip=null,this.activeEl=null,this.observer=null,this.boundElements=new WeakSet,this.elementHandlers=new Map,this.interactionState=new WeakMap,this._showTimer=null,this._hideTimer=null,this._repositionFrame=null,this._resizeObserver=null,this._scrollRef=()=>this.requestReposition(),this._clickRef=t=>{this.activeEl&&"click"===this._getElementConfig(this.activeEl).action&&(t.target===this.activeEl||this.activeEl.contains(t.target)||this.hide())},this._keyRef=t=>{"Escape"===t.key&&this.hide()},this.options.autoInit&&"undefined"!=typeof document&&(this.init(),this.options.observeMutations&&this._initObserver()),"undefined"!=typeof document&&(document.addEventListener("keydown",this._keyRef),document.addEventListener("click",this._clickRef))}
/**
   * Normalizes invalid public options and reports actionable diagnostics.
   * @returns {void}
   * @private
   */_validateOptions(){const t={offset:14,padding:10,showDelay:0,hideDelay:0,motionIntensity:1};for(const[e,i]of Object.entries(t)){const t=Number(this.options[e]);!Number.isFinite(t)||t<0?("undefined"!=typeof console&&"function"==typeof console.warn&&console.warn(`[Lume] Invalid ${e}; using ${i}.`),this.options[e]=i):this.options[e]=t}this.options.motionIntensity=Math.max(0,Math.min(3,this.options.motionIntensity)),["hover","click"].includes(this.options.action)||("undefined"!=typeof console&&"function"==typeof console.warn&&console.warn("[Lume] Invalid action; using hover."),this.options.action="hover"),["minimal","simple","advanced"].includes(this.options.tier)||("undefined"!=typeof console&&"function"==typeof console.warn&&console.warn("[Lume] Invalid tier; using simple."),this.options.tier="simple"),["left","right","top","bottom"].includes(this.options.dotPosition)||("undefined"!=typeof console&&"function"==typeof console.warn&&console.warn("[Lume] Invalid dotPosition; using left."),this.options.dotPosition="left"),["left","center","right"].includes(this.options.align)||("undefined"!=typeof console&&"function"==typeof console.warn&&console.warn("[Lume] Invalid align; using center."),this.options.align="center");const e=["top","bottom","right","left"],i=Array.isArray(this.options.priority)?this.options.priority:"string"==typeof this.options.priority?this.options.priority.split(","):[];if(this.options.priority=[...new Set(i.filter(t=>e.includes(t)))],this.options.priority.length||(this.options.priority=e),"string"!=typeof this.options.selector||!this.options.selector.trim())return this.options.selector="[data-lume], [data-lume-content]",void("undefined"!=typeof console&&"function"==typeof console.warn&&console.warn("[Lume] Invalid selector; using [data-lume], [data-lume-content]."));if("undefined"!=typeof document)try{document.querySelector(this.options.selector)}catch(t){this.options.selector="[data-lume], [data-lume-content]","undefined"!=typeof console&&"function"==typeof console.warn&&console.warn("[Lume] Invalid selector; using [data-lume], [data-lume-content].")}}
/**
   * Scans the document and attaches event listeners to matching elements.
   * @returns {void}
   */init(){if("undefined"==typeof document)return;document.querySelectorAll(this.options.selector).forEach(t=>{t instanceof HTMLElement&&this._bindEvents(t)})}
/**
   * Binds interaction events to a target element.
   * @param {HTMLElement} el - Element to bind.
   * @returns {void}
   * @private
   */_bindEvents(t){if(!t||this.boundElements.has(t))return;const e={pointer:!1,focus:!1},i={mouseenter:()=>{"hover"===this._getElementConfig(t).action&&(e.pointer=!0,this.show(t))},mouseleave:()=>{"hover"===this._getElementConfig(t).action&&(e.pointer=!1,e.focus||this.hide())},focus:()=>{"hover"===this._getElementConfig(t).action&&(e.focus=!0,this.show(t))},blur:()=>{"hover"===this._getElementConfig(t).action&&(e.focus=!1,e.pointer||this.hide())},click:()=>{"click"===this._getElementConfig(t).action&&(this.activeEl===t?this.hide():this.show(t))},keydown:e=>{"click"===this._getElementConfig(t).action&&["Enter"," "].includes(e.key)&&(e.preventDefault(),t.click())}};t.addEventListener("mouseenter",i.mouseenter),t.addEventListener("mouseleave",i.mouseleave),t.addEventListener("focus",i.focus),t.addEventListener("blur",i.blur),t.addEventListener("click",i.click),t.addEventListener("keydown",i.keydown),this.interactionState.set(t,e),this.elementHandlers.set(t,i),this.boundElements.add(t)}
/**
   * Initializes MutationObserver to monitor DOM additions and removals.
   * @returns {void}
   * @private
   */_initObserver(){if("undefined"==typeof MutationObserver||"undefined"==typeof document)return;this.observer=new MutationObserver(t=>{for(const e of t)e.addedNodes.forEach(t=>{if(1!==t.nodeType)return;const e=
/** @type {HTMLElement} */t;e.matches&&e.matches(this.options.selector)&&this._bindEvents(e),e.querySelectorAll&&e.querySelectorAll(this.options.selector).forEach(t=>{t instanceof HTMLElement&&this._bindEvents(t)})}),this.activeEl&&e.removedNodes.forEach(t=>{(t===this.activeEl||t.contains&&t.contains(this.activeEl))&&this.hide()})});const t=this.options.container||document.body;t&&this.observer.observe(t,{childList:!0,subtree:!0})}
/**
   * Creates or returns the single reusable tooltip DOM node.
   * @private
   * @returns {HTMLElement}
   */_create(){if(this.tooltip)return this.tooltip;const t=document.createElement("div");t.className="lume-tooltip",t.setAttribute("role","tooltip"),t.setAttribute("aria-hidden","true"),"function"==typeof t.showPopover&&t.setAttribute("popover","manual"),t.style.display="none",t.innerHTML='<div class="lume-header"></div><div class="lume-content"></div><span class="lume-dot" aria-hidden="true"></span><div class="lume-arrow"></div>';return(this.options.container||document.body).appendChild(t),this.tooltip=t,t}
/**
   * Resolves configuration for a specific trigger element.
   * @param {HTMLElement} el - Trigger element.
   * @private
   * @returns {LumeElementConfig}
   */_getElementConfig(t){const e=t.getAttribute("data-lume-title")||"",i=t.getAttribute("data-lume-icon")||this.options.icon||"",o=t.getAttribute("data-lume-dot")||this.options.dot||"",n=document.createElement("span");n.style.backgroundColor=o;const s=n.style.backgroundColor?o:"",l=t.getAttribute("data-lume-dot-position")||this.options.dotPosition,r=t.getAttribute("data-lume-align")||this.options.align,a=t.getAttribute("data-lume-content")||t.getAttribute("data-lume")||"",c=t.getAttribute("data-lume-direction")||"top",d=t.getAttribute("data-lume-priority"),h=null===d?this.options.priority:d.split(","),u=[...new Set(h.map(t=>t.trim()).filter(t=>["top","bottom","right","left"].includes(t)))],m=t.getAttribute("data-lume-offset"),p=null!==m?Number.parseInt(m,10):this.options.offset,f=t.getAttribute("data-lume-class")||this.options.className,v=t.getAttribute("data-lume-tier")||this.options.tier,y=t.getAttribute("data-lume-motion")||this.options.motion,w=t.getAttribute("data-lume-action")||this.options.action,g=t.getAttribute("data-lume-smart"),b=t.getAttribute("data-lume-intensity"),E=null!==b?Number.parseFloat(b):this.options.motionIntensity,_=["fade","lift","scale","slide","pop","blur","bounce","swing","flip","none"].includes(y)?y:"fade";return{title:e,icon:i,dot:s,dotPosition:["left","right","top","bottom"].includes(l)?l:"left",align:["left","center","right"].includes(r)?r:"center",content:a,direction:["auto","top","bottom","left","right"].includes(c)?c:"top",priority:u.length?u:this.options.priority,offset:Number.isNaN(p)?this.options.offset:p,customClass:f,tier:["minimal","simple","advanced"].includes(v)?v:"simple",motion:_,motionIntensity:Number.isFinite(E)?Math.max(0,Math.min(3,E)):this.options.motionIntensity,action:["hover","click"].includes(w)?w:"hover",smart:null===g?this.options.smart:"false"!==g}}
/**
   * Converts the small Lume formatting vocabulary into DOM nodes without parsing HTML.
   * @param {string} value - Plain text with optional Lume formatting tokens.
   * @returns {DocumentFragment}
   * @private
   */_parseContent(t){var e;const i=document.createDocumentFragment(),o=[{name:null,node:i}],n=/\{([^{}]+)\}/g,s={b:"strong",i:"em",c:"code",s:"small",l:"span",u:"u",mark:"mark",kbd:"kbd",ol:"ol",ul:"ul",li:"li"},l={eyebrow:["span","lume-eyebrow"],p:["p","lume-paragraph"],row:["div","lume-row"],label:["span","lume-label"],value:["span","lume-value"],chip:["span","lume-chip"],foot:["div","lume-foot"],emp:["div","lume-emphasis"]},r=new Set(["b","i","c","s","l","u","mark","kbd"]),a=new Set(["blue","mint","peach","lavender","coral","lemon","sky","rose"]);let c,d=0;const h=t=>{t&&o[o.length-1].node.appendChild(document.createTextNode(t))};for(;null!==(c=n.exec(t));){h(t.slice(d,c.index));const i=c[1].trim().toLowerCase();if("br"===i)o[o.length-1].node.appendChild(document.createElement("br"));else if(i.startsWith("/")){const t=i.slice(1),n=o[o.length-1];o.length>1&&(n.name===t||(null==(e=n.closers)?void 0:e.includes(t)))?o.pop():h(c[0])}else if(i.includes(":")){const t=i.split(":").map(t=>t.trim()).filter(Boolean);if(t.length>1&&t.every(t=>r.has(t)||t.startsWith("sp-")&&a.has(t.slice(3)))){let e=o[o.length-1].node;t.forEach(t=>{const i=document.createElement(t.startsWith("sp-")?"span":s[t]);"l"===t&&(i.className="lume-large"),t.startsWith("sp-")&&(i.className=`lume-sp-${t.slice(3)}`),e.appendChild(i),e=i}),o.push({name:"lme",node:e,closers:["lme"]})}else h(c[0])}else if(s[i]||l[i]){const t=l[i]||[s[i],null],e=document.createElement(t[0]);"l"===i&&(e.className="lume-large"),t[1]&&(e.className=t[1]),o[o.length-1].node.appendChild(e),o.push({name:i,node:e,closers:[i,"lme"]})}else h(c[0]);d=n.lastIndex}return h(t.slice(d)),i}
/**
   * Schedules a single animation-frame position update.
   * @returns {void}
   */requestReposition(){this.activeEl&&this.tooltip&&null===this._repositionFrame&&(this._repositionFrame=window.requestAnimationFrame(()=>{this._repositionFrame=null,this.reposition()}))}
/**
   * Recalculates coordinates and updates tooltip position on screen.
   * @param {boolean} [activate=true] Whether to apply the active visual state.
   * @returns {void}
   */reposition(t=!0){if(!this.activeEl||!this.tooltip)return;const e=this._getElementConfig(this.activeEl),i=["lume-tooltip",...t?["lume-active"]:["lume-positioning"],`lume-dir-${e.direction}`,`lume-motion-${e.motion}`,`lume-tier-${e.tier}`,...e.dot?["lume-has-dot",`lume-dot-${e.dotPosition}`]:[]];e.customClass&&i.push(e.customClass),this.tooltip.className=i.join(" ");const o=this.activeEl.getBoundingClientRect(),n=this.tooltip.getBoundingClientRect();let s=e.direction;const l=e.offset,r=this.options.container&&this.options.container!==document.body?this.options.container:null,a=null==r?void 0:r.getBoundingClientRect(),c=(null==r?void 0:r.scrollLeft)||0,d=(null==r?void 0:r.scrollTop)||0,h=window.pageYOffset||document.documentElement.scrollTop||0,u=window.pageXOffset||document.documentElement.scrollLeft||0,m=r?o.left-a.left+c:o.left+u,p=r?o.top-a.top+d:o.top+h,f=r?o.right-a.left+c:o.right+u,v=r?o.bottom-a.top+d:o.bottom+h,y=this.options.boundary||r,w=null==y?void 0:y.getBoundingClientRect(),g=y?y.clientWidth:window.innerWidth,b=y?y.clientHeight:window.innerHeight,E=y?r?w.left-a.left+c:w.left+u:u,_=y?r?w.top-a.top+d:w.top+h:h,L=Math.max(0,Number(this.options.padding)||0),k="auto"===e.direction||o.width>0||o.height>0;if(e.smart&&k){const t={top:p-_,bottom:_+b-v,right:E+g-f,left:m-E},i=i=>{if("top"===i||"bottom"===i){const s="left"===e.align?m:"right"===e.align?f-n.width:m+o.width/2-n.width/2;return t[i]>=n.height+l&&s>=E+L&&s+n.width<=E+g-L}const s=p+o.height/2-n.height/2;return t[i]>=n.width+l&&s>=_+L&&s+n.height<=_+b-L},r=e.priority.filter(t=>t!==s);"auto"!==s&&i(s)||(s=("auto"!==s&&i(s)?s:void 0)||r.find(i)||Object.entries(t).sort((t,e)=>e[1]-t[1])[0][0])}const C=["lume-tooltip",...t?["lume-active"]:["lume-positioning"],`lume-dir-${s}`,`lume-motion-${e.motion}`,`lume-tier-${e.tier}`,...e.dot?["lume-has-dot",`lume-dot-${e.dotPosition}`]:[]];e.customClass&&C.push(e.customClass),this.tooltip.className=C.join(" ");let A=0,M=0;switch(s){case"top":A=p-n.height-l,M="left"===e.align?m:"right"===e.align?f-n.width:m+o.width/2-n.width/2;break;case"bottom":A=v+l,M="left"===e.align?m:"right"===e.align?f-n.width:m+o.width/2-n.width/2;break;case"left":A=p+o.height/2-n.height/2,M=m-n.width-l;break;case"right":A=p+o.height/2-n.height/2,M=f+l}const N=E+L,x=E+g-n.width-L,T=_+L,O=_+b-n.height-L;M=Math.max(N,Math.min(M,x)),A=Math.max(T,Math.min(A,O));const P=m+o.width/2,R=p+o.height/2,I=Math.max(12,Math.min(n.width-12,P-M)),S=Math.max(12,Math.min(n.height-12,R-A)),H="slide"===e.motion?"left"===s?"6px":"right"===s?"-6px":"0px":"0px",$="lift"===e.motion?"6px":"slide"===e.motion?"top"===s?"6px":"bottom"===s?"-6px":"0px":"0px";this.tooltip.style.setProperty("--lume-x",`${Math.round(M)}px`),this.tooltip.style.setProperty("--lume-y",`${Math.round(A)}px`),this.tooltip.style.setProperty("--lume-from-x",H),this.tooltip.style.setProperty("--lume-from-y",$),this.tooltip.style.setProperty("--lume-motion-intensity",String(e.motionIntensity)),this.tooltip.style.setProperty("--lume-arrow-x",`${Math.round(I)}px`),this.tooltip.style.setProperty("--lume-arrow-y",`${Math.round(S)}px`)}
/**
   * Activates and positions tooltip for a specified target element.
   * @param {HTMLElement} el - Element to show tooltip for.
   * @returns {void}
   */show(t){if(!(t&&t instanceof HTMLElement))return;window.clearTimeout(this._hideTimer),window.clearTimeout(this._showTimer);const e=Math.max(0,Number(this.options.showDelay)||0);0!==e?this._showTimer=window.setTimeout(()=>this._showNow(t),e):this._showNow(t)}
/**
   * Populates and displays the reusable tooltip node without applying the show delay.
   * @param {HTMLElement} el - Trigger element to display.
   * @returns {void}
   * @private
   */_showNow(t){var e,i,o;if(!(t&&t instanceof HTMLElement))return;this.tooltip||this._create(),this.tooltip.style.display="none";const n=this.activeEl;this.activeEl=t;const l=this._getElementConfig(t),r=this.tooltip.querySelector(".lume-header"),a=this.tooltip.querySelector(".lume-content");if(r){r.replaceChildren();let t=!1;if(l.icon)if("info"===l.icon.toLowerCase()){const e=document.createElement("span");e.className="lume-info-icon",e.textContent="i",e.setAttribute("aria-hidden","true"),r.appendChild(e),t=!0}else try{const e=new URL(l.icon,document.baseURI);if(["http:","https:"].includes(e.protocol)){const i=document.createElement("img");i.className="lume-title-icon",i.src=e.href,i.alt="",i.setAttribute("aria-hidden","true"),r.appendChild(i),t=!0}}catch(t){}l.title&&r.appendChild(this._parseContent(l.title)),r.style.display=l.title||t?"flex":"none"}const c=this.tooltip.querySelector(".lume-dot");if(c instanceof HTMLElement&&(c.style.backgroundColor="",l.dot&&(c.style.backgroundColor=l.dot,c.style.backgroundColor||c.removeAttribute("style"))),a&&(this.options.allowHTML?a.innerHTML=l.content:a.replaceChildren(this._parseContent(l.content))),null==n||n.removeAttribute("aria-describedby"),this.tooltip.id||(s+=1,this.tooltip.id=`lume-tooltip-${s}`),t.setAttribute("aria-describedby",this.tooltip.id),this.tooltip.setAttribute("aria-hidden","false"),this.tooltip.style.display="flex","function"==typeof this.tooltip.showPopover)try{(null==(i=(e=this.tooltip).matches)?void 0:i.call(e,":popover-open"))&&this.tooltip.hidePopover(),this.tooltip.showPopover()}catch(t){}this.reposition(!1),this.tooltip.classList.add("lume-no-entry"),this.tooltip.classList.add("lume-active"),window.setTimeout(()=>{this.tooltip&&this.activeEl===t&&this.tooltip.classList.remove("lume-positioning")},0),"undefined"!=typeof ResizeObserver&&(null==(o=this._resizeObserver)||o.disconnect(),this._resizeObserver=new ResizeObserver(()=>this.requestReposition()),this._resizeObserver.observe(this.tooltip),this._resizeObserver.observe(t)),window.addEventListener("scroll",this._scrollRef,{passive:!0}),window.addEventListener("resize",this._scrollRef,{passive:!0})}
/**
   * Deactivates the tooltip.
   * @returns {void}
   */hide(){if(window.clearTimeout(this._showTimer),window.clearTimeout(this._hideTimer),!this.tooltip)return;const t=Math.max(0,Number(this.options.hideDelay)||0);0!==t?this._hideTimer=window.setTimeout(()=>this._hideNow(),t):this._hideNow()}
/**
   * Updates the active trigger's data and refreshes the visible tooltip.
   * @param {HTMLElement} el - Trigger element to update.
   * @param {Partial<LumeElementConfig>} values - Values to write to the trigger.
   * @returns {void}
   */update(t,e={}){if(!(t&&t instanceof HTMLElement&&e&&"object"==typeof e))return;const i={title:"data-lume-title",content:"data-lume-content",direction:"data-lume-direction",offset:"data-lume-offset",motion:"data-lume-motion",intensity:"data-lume-intensity",action:"data-lume-action",icon:"data-lume-icon",align:"data-lume-align",smart:"data-lume-smart",tier:"data-lume-tier",dot:"data-lume-dot",dotPosition:"data-lume-dot-position",priority:"data-lume-priority"};for(const[o,n]of Object.entries(i))void 0!==e[o]&&t.setAttribute(n,String(e[o]));this.activeEl===t&&this._showNow(t)}
/**
   * Hides the tooltip immediately and removes active positioning listeners.
   * @returns {void}
   * @private
   */_hideNow(){var t,e,i,o;if(this.tooltip&&(this.tooltip.classList.remove("lume-active"),this.tooltip.setAttribute("aria-hidden","true"),"function"==typeof this.tooltip.hidePopover))try{(null==(e=(t=this.tooltip).matches)?void 0:e.call(t,":popover-open"))&&this.tooltip.hidePopover()}catch(t){}null==(i=this.activeEl)||i.removeAttribute("aria-describedby"),"undefined"!=typeof window&&(window.removeEventListener("scroll",this._scrollRef),window.removeEventListener("resize",this._scrollRef)),null!==this._repositionFrame&&"undefined"!=typeof window&&(window.cancelAnimationFrame(this._repositionFrame),this._repositionFrame=null),null==(o=this._resizeObserver)||o.disconnect(),this._resizeObserver=null,this.activeEl=null}
/**
   * Disconnects observers, event listeners, and removes the tooltip DOM node.
   * @returns {void}
   */destroy(){window.clearTimeout(this._showTimer),window.clearTimeout(this._hideTimer),this._hideNow();for(const[t,e]of this.elementHandlers)t.removeEventListener("mouseenter",e.mouseenter),t.removeEventListener("mouseleave",e.mouseleave),t.removeEventListener("focus",e.focus),t.removeEventListener("blur",e.blur),t.removeEventListener("click",e.click),t.removeEventListener("keydown",e.keydown);this.elementHandlers.clear(),"undefined"!=typeof document&&(document.removeEventListener("keydown",this._keyRef),document.removeEventListener("click",this._clickRef)),this.observer&&(this.observer.disconnect(),this.observer=null),this.tooltip&&this.tooltip.parentNode&&(this.tooltip.parentNode.removeChild(this.tooltip),this.tooltip=null),this.boundElements=new WeakSet}}"undefined"!=typeof window&&(window.Lume=l);export{l as Lume,l as default};
//# sourceMappingURL=lume.mjs.map
