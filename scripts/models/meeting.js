export class Meeting {
  constructor(title, sequences) {
    this.title = title || 'New meeting';
    this.sequences = sequences || [];
  }

  getTitle() {
    return this.title;
  }

  getSequences() {
    return this.sequences;
  }

  getSequence(i) {
    return this.sequences[i];
  }

  setTitle(t) {
    this.title = t;
  }

  setSequences(s) {
    this.sequences = s;
  }

  addSequence(s) {
    this.sequences.push(s);
  }

  removeSequence(s) {
    const i = this.sequences.indexOf(s);
    this.sequences.slice(i, 1);
  }
}
