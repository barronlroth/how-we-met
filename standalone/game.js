/* global Phaser */
(() => {
  const WIDTH = 640;
  const HEIGHT = 360;
  const FLOOR_HEIGHT = 32;
  const GROUND_Y = HEIGHT - FLOOR_HEIGHT;
  const WALK_SPEED = 140;
  const MEET_DISTANCE = 2000;
  const ASSET_ROOT = "../assets/";
  const ASSET_BASE = `${ASSET_ROOT}Pixel Art Video Game Barron Nina/`;
  const asset = (name) => encodeURI(`${ASSET_BASE}${name}`);
  const assetRoot = (name) => encodeURI(`${ASSET_ROOT}${name}`);
  const rootFile = (name) => encodeURI(`../${name}`);

  class MeetingScene extends Phaser.Scene {
    preload() {
      const { width, height } = this.scale;
      const barWidth = 300;
      const barHeight = 10;
      const barX = (width - barWidth) / 2;
      const barY = height / 2;

      const progressBox = this.add.graphics();
      progressBox.fillStyle(0x1b2740, 0.9);
      progressBox.fillRoundedRect(barX - 8, barY - 8, barWidth + 16, barHeight + 16, 6);

      const progressBar = this.add.graphics();
      const loadingText = this.add
        .text(width / 2, barY - 26, "Loading Toronto...", {
          fontFamily: "Arial, sans-serif",
          fontSize: "14px",
          color: "#dbe6ff",
        })
        .setOrigin(0.5);

      this.load.on("progress", (value) => {
        progressBar.clear();
        progressBar.fillStyle(0x7aa2ff, 1);
        progressBar.fillRoundedRect(barX, barY, barWidth * value, barHeight, 4);
      });

      this.load.on("complete", () => {
        progressBar.destroy();
        progressBox.destroy();
        loadingText.destroy();
      });

      this.load.image("far", asset("far-bg.png"));
      this.load.image("mid", asset("mid-bg.png"));
      this.load.image("near", assetRoot("bg-near.png"));
      this.load.image("barron", asset("barron-v1.png"));
      this.load.audio(
        "bgm",
        [rootFile("Nokia [8 Bit Tribute to Drake] - 8 Bit Universe-low.mp3")]
      );
    }

    create() {
      this.createFloorTexture();
      this.createNinaTexture();

      this.far = this.add.tileSprite(0, 0, WIDTH, HEIGHT, "far").setOrigin(0, 0);
      this.horizon = this.add.tileSprite(0, 0, WIDTH, HEIGHT, "mid").setOrigin(0, 0);

      const nearHeight = HEIGHT;
      const nearY = HEIGHT - FLOOR_HEIGHT - nearHeight;
      this.near = this.add.tileSprite(0, nearY, WIDTH, nearHeight, "near").setOrigin(0, 0);

      this.floor = this.add
        .tileSprite(0, HEIGHT - FLOOR_HEIGHT, WIDTH, FLOOR_HEIGHT, "floor")
        .setOrigin(0, 0);

      this.barron = this.add.sprite(160, GROUND_Y, "barron").setOrigin(0.5, 1);
      this.barron.setDepth(5);

      this.nina = this.add.sprite(WIDTH + 60, GROUND_Y, "nina").setOrigin(0.5, 1);
      this.nina.setVisible(false);
      this.nina.setDepth(5);

      this.messageBox = this.createMessageBox();

      this.musicStarted = false;
      this.music = this.sound.add("bgm", { loop: true, volume: 0.35 });
      this.startMusic = () => {
        if (this.musicStarted) return;
        this.musicStarted = true;
        this.music.play();
      };

      this.input.once("pointerdown", this.startMusic);
      this.input.keyboard.once("keydown", this.startMusic);

      this.pointerDown = false;
      this.distance = 0;
      this.met = false;

      this.cursors = this.input.keyboard.createCursorKeys();
      this.input.on("pointerdown", () => {
        this.pointerDown = true;
      });
      this.input.on("pointerup", () => {
        this.pointerDown = false;
      });
      this.input.on("pointerout", () => {
        this.pointerDown = false;
      });
      this.input.on("gameout", () => {
        this.pointerDown = false;
      });
    }

    update(_time, delta) {
      const dt = delta / 1000;
      const walking = (this.cursors.right && this.cursors.right.isDown) || this.pointerDown;

      if (!this.met && walking) {
        const dx = WALK_SPEED * dt;
        this.distance += dx;

        this.far.tilePositionX += dx * 0.1;
        this.horizon.tilePositionX += dx * 0.3;
        this.near.tilePositionX += dx * 0.6;
        this.floor.tilePositionX += dx;

        if (!this.nina.visible && this.distance >= MEET_DISTANCE) {
          this.nina.setVisible(true);
        }

        if (this.nina.visible) {
          this.nina.x -= dx;
        }
      }

      if (!this.met && this.nina.visible && this.checkMeet()) {
        this.triggerMeet();
      }
    }

    checkMeet() {
      const barronBounds = this.barron.getBounds();
      const ninaBounds = this.nina.getBounds();
      return Phaser.Geom.Intersects.RectangleToRectangle(barronBounds, ninaBounds);
    }

    triggerMeet() {
      this.met = true;
      this.messageBox.setVisible(true);
    }

    createFloorTexture() {
      const g = this.add.graphics();
      const tileWidth = 32;
      const tileHeight = FLOOR_HEIGHT;

      g.fillStyle(0x2b2b2b, 1);
      g.fillRect(0, 0, tileWidth, tileHeight);
      g.fillStyle(0x3a3a3a, 1);
      g.fillRect(0, tileHeight - 8, tileWidth, 4);
      g.fillStyle(0x4a4a4a, 1);
      g.fillRect(0, tileHeight - 4, tileWidth, 2);
      g.fillStyle(0x1f1f1f, 1);
      g.fillRect(6, 6, 20, 2);
      g.fillRect(4, 16, 24, 2);

      g.generateTexture("floor", tileWidth, tileHeight);
      g.destroy();
    }

    createNinaTexture() {
      const g = this.add.graphics();
      const width = 26;
      const height = 62;

      g.fillStyle(0xff7aa2, 1);
      g.fillRoundedRect(0, 8, width, height - 8, 6);
      g.fillStyle(0xffc1d6, 1);
      g.fillRoundedRect(4, 0, width - 8, 16, 6);
      g.fillStyle(0xffffff, 1);
      g.fillRect(6, 26, width - 12, 6);

      g.generateTexture("nina", width, height);
      g.destroy();
    }

    createMessageBox() {
      const boxWidth = 360;
      const boxHeight = 90;
      const x = (WIDTH - boxWidth) / 2;
      const y = 30;

      const bg = this.add.graphics();
      bg.fillStyle(0x0f1626, 0.92);
      bg.fillRoundedRect(x, y, boxWidth, boxHeight, 12);
      bg.lineStyle(2, 0x5f7db8, 0.8);
      bg.strokeRoundedRect(x, y, boxWidth, boxHeight, 12);

      const text = this.add
        .text(WIDTH / 2, y + boxHeight / 2, "Hearts in Toronto.\nSave the Date!", {
          fontFamily: "Arial, sans-serif",
          fontSize: "16px",
          color: "#e6eefc",
          align: "center",
        })
        .setOrigin(0.5);

      const container = this.add.container(0, 0, [bg, text]);
      container.setDepth(10);
      container.setVisible(false);
      return container;
    }
  }

  const config = {
    type: Phaser.AUTO,
    width: WIDTH,
    height: HEIGHT,
    parent: "game",
    backgroundColor: "#0b0f1a",
    pixelArt: true,
    roundPixels: true,
    fps: { target: 60 },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [MeetingScene],
  };

  new Phaser.Game(config);
})();
