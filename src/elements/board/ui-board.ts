import { CSSResultOrNative } from "lit";
import { customElement } from "lit/decorators.js";
import Element from "./Board.js";
import styles from "./Styles.js";

@customElement('ui-board')
export class UiBoardElement extends Element {
  static override styles: CSSResultOrNative[] = [styles];
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-board': UiBoardElement;
  }
}
