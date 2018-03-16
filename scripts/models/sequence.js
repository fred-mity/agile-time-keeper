export class Sequence {
    constructor(title, duration, color) {
      this.title = title || 'New sequence';
      this.duration = duration || 0;
      this.color = color || 'blue';
    }

    getTitle() {
      return this.title;
    }

    getDuration() {
      return this.sequences;
    }

    getColor() {
        return this.color;
    }

    setTitle(t) {
      this.title = t;
    }

    setDuration(d) {
      this.duration = d;
    }

    setColor(c) {
      this.color = c;
    }
  }
