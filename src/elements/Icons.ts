import { svg, SVGTemplateResult } from 'lit';

/**
 * Wraps icon into an SVG container.
 * @param tpl Icon definition
 * @returns Complete SVG icon definition
 */
export const iconWrapper = (tpl: SVGTemplateResult, width = 24, height = 24, viewBox: {x?: number, y?: number, width?: number, height?: number} = { x: 0, y: 0, width, height }): SVGTemplateResult => {
  const { x: vx = 0, y: vy = 0, width: vw = width, height: vh = height } = viewBox;
  return svg`<svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="${vx} ${vy} ${vw} ${vh}" 
    preserveAspectRatio="xMidYMid meet" 
    focusable="false" 
    style="pointer-events: none; display: block; width: ${width}px; height: ${height}px;">${tpl}</svg>`;
}

export type IconType = 'refresh' | 'undo' | 'redo' | 'settings' | 'close' | 'bolt' | 'volumeUp' | 'volumeOff' | 'lightbulb';
export const refresh = iconWrapper(svg`<path d="M480-160q-134 0-227-93t-93-227q0-134 93-227t227-93q69 0 132 28.5T720-690v-110h80v280H520v-80h168q-32-56-87.5-88T480-720q-100 0-170 70t-70 170q0 100 70 170t170 70q77 0 139-44t87-116h84q-28 106-114 173t-196 67Z"/>`, undefined, undefined, { y: -960, width: 960, height: 960 });
export const undo = iconWrapper(svg`<path d="M280-200v-80h284q63 0 109.5-40T720-420q0-60-46.5-100T564-560H312l104 104-56 56-200-200 200-200 56 56-104 104h252q97 0 166.5 63T800-420q0 94-69.5 157T564-200H280Z"/>`, undefined, undefined, { y: -960, width: 960, height: 960 });
export const redo = iconWrapper(svg`<path d="M680-200v-80H396q-63 0-109.5-40T240-420q0-60 46.5-100t109.5-40h252L544-664l56-56 200 200-200 200-56-56 104-104H396q-97 0-166.5 63T160-420q0 94 69.5 157t166.5 63h284Z"/>`, undefined, undefined, { y: -960, width: 960, height: 960 });
export const settings = iconWrapper(svg`<path d="m370-80-16-128q-13-5-24.5-12T307-235l-119 50L78-375l103-78q-1-7-1-13.5v-27q0-6.5 1-13.5L78-585l110-190 119 50q11-8 23-15t24-12l16-128h220l16 128q13 5 24.5 12t22.5 15l119-50 110 190-103 78q1 7 1 13.5v27q0 6.5-2 13.5l103 78-110 190-118-50q-11 8-23 15t-24 12L590-80H370Zm112-280q50 0 85-35t35-85q0-50-35-85t-85-35q-50 0-85 35t-35 85q0 50 35 85t85 35Z"/>`, undefined, undefined, { y: -960, width: 960, height: 960 });
export const close = iconWrapper(svg`<path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"/>`, undefined, undefined, { y: -960, width: 960, height: 960 });
export const bolt = iconWrapper(svg`<path d="m320-80 40-280H200l360-520h80l-40 320h200L400-80h-80Z"/>`, undefined, undefined, { y: -960, width: 960, height: 960 });
export const volumeUp = iconWrapper(svg`<path d="M560-131v-82q90-26 145-100t55-167q0-93-55-167T560-747v-82q124 28 202 125.5T840-480q0 127-78 224.5T560-131ZM120-360v-240h160l200-200v640L280-360H120Zm440 40v-322q47 22 73.5 65.5T660-480q0 53-26.5 96.5T560-320Z"/>`, undefined, undefined, { y: -960, width: 960, height: 960 });
export const volumeOff = iconWrapper(svg`<path d="M792-56 671-177q-25 16-53 27.5T560-131v-82q14-5 27.5-11.5T613-235L480-368v208L280-360H120v-240h128L56-792l56-56 736 736-56 56ZM560-747v-82q124 28 202 125.5T840-480q0 53-14.5 102T782-288l-58-58q16-31 25-65.5t9-70.5q0-93-55-167t-145-100Zm0 185v-142q38 18 60 52.5t20 74.5q0 7-1 14t-3 14l-76-13Z"/>`, undefined, undefined, { y: -960, width: 960, height: 960 });
export const lightbulb = iconWrapper(svg`<path d="M480-80q-33 0-56.5-23.5T400-160h160q0 33-23.5 56.5T480-80ZM280-240v-80h400v80H280Zm0-120q-58-39-89-99.5T160-580q0-133 93.5-226.5T480-900q133 0 226.5 93.5T800-580q0 60-31 120.5T680-360H280Zm64-80h272q39-33 59.5-77.5T696-580q0-90-63-153t-153-63q-90 0-153 63t-63 153q0 48 20.5 92.5T344-440Zm136-140Z"/>`, undefined, undefined, { y: -960, width: 960, height: 960 });




