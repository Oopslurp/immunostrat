import Phaser from "phaser";

export class UIScene extends Phaser.Scene {
  constructor() {
    super("UIScene");
  }

  create() {
    this.add.text(24, 22, "V1 - placeholder gameplay prototype", {
      color: "#c7d7df",
      fontFamily: "monospace",
      fontSize: "15px",
    });
  }
}
