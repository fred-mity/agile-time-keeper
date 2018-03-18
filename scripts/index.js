import { Meeting } from './models/meeting.js';
import { Sequence } from './models/sequence.js';

/*
 * Main global properties :
 * {html nodes} bar and time progression
 * {function} interval
 * {object} meeting
 * {properties} width, time, marge, step, stepStart, isPaused, isSound, sequenceForm
 */
let meeting,
  interval,
  bar,
  totalProgression,
  sequenceProgression,
  marge,
  width,
  time,
  step,
  stepStart,
  totalDuration,
  isPaused,sequenceForm,
  isSound;


// INITIALISATION -------------------------------------------------

/**
 * Init our ATK page
 *
 */
function init() {
  loadMeetingFromJson('data');

  // Keep our sequence UI forms (for modification purpose)
  sequenceForm = [];
}

/**
 * Set the page content
 * : title, current date,
 *
 */
function setPage() {
  // Set current date
  const today = new Date();

  const d = today.getDay();
  const m = today.getMonth();
  const y = today.getFullYear();

  const todayStr = `${(d <= 9 ? '0' + d : d)}/${(m <= 9 ? '0' + m : m)}/${y}`

  // Set title and date
  document.querySelector("#title").innerHTML = meeting.title;
  document.querySelector("#date").innerHTML = todayStr;

  // Init progress bar
  if (interval) {
    clearInterval(interval);
    interval = undefined;
  }
  initProgressBarUI(meeting.getSequences());

  if(!sequenceForm.length) {
    // Add a first sequence to settings view
    addSeqForm();
  }
}

/**
 * Load a meeting template JSON
 * : If callback, launch it instead of refreshing the page directly
 * @param {string} fileName
 * @param {function} callback
 */
function loadMeetingFromJson(fileName, callback) {
  // load a meeting template with given name
  const xmlhttp = new XMLHttpRequest();
  const url = `meetings/${fileName}.json`;

  xmlhttp.onreadystatechange = function() {
    if(this.readyState == 1) {
      load(true);
    }
    if (this.readyState == 4 && this.status == 200) {
      const res = JSON.parse(this.responseText);
      meeting = new Meeting(res.title, res.sequences);

      if(!callback) {
        setPage();
      } else {
        callback();
      }

      load(false);
    }
  };

  xmlhttp.open("GET", url, true);
  xmlhttp.send();
};

/**
 * Toggle loader
 *
 * @param {any} bool
 */
function load(bool) {
  const loader = document.querySelector('#loader-container');
  if(bool) {
      loader.style.opacity = 1;
      loader.style.pointerEvents = all;
  } else {
      loader.style.opacity = 0;
      loader.style.pointerEvents = none;
  }
}

/**
 * Create the time progress bar view
 * Append progress bars in it according to the array
 * @param {array} arr
 */
function initProgressBarUI(arr) {
  setSequenceSize(arr);

  let out =
    '<div id="bar" class="bar"></div> \
  <span id="startText" class="progress-text">Start</span> ';
  let i;
  for (i = 0; i < arr.length; i++) {
    out +=
      '<div class="progress-bar progress-bar-striped \
          progress-bar-animated ' +
      arr[i].color +
      '" \
          role="progressbar" aria-valuemin="0" \
          aria-valuemax="' +
      totalDuration +
      '" \
          style="width:' +
      arr[i].durationPercent +
      "%; \
          background-color:" +
      arr[i].color +
      ';">' +
      arr[i].title +
      "<br/>(" +
      timeConversion(60000 * arr[i].duration) +
      ")</div>";
  }

  document.querySelector("#progress").innerHTML = out;


  setProgressBarProperties();
  setDate();
}

/**
 * Initialise progression interval mechanism
 *
 */
function initProgressionMainProperties() {
  // REUSABLE NODES USED IN INTERVAL
  // The progress bar node
  bar = document.querySelector("#bar");
  // The progression text nodes (timers)
  sequenceProgression = document.querySelector("#sequenceProgression");
  totalProgression = document.querySelector("#totalProgression");

  interval = setInterval(progress, 10);
}

/**
 * Init the progress bar default properties
 *
 */
function setProgressBarProperties() {
  // Default start time
  time = 0;

  // The progress bar size in percent
  width = 100;

  // The percentage of the progress bar
  // at which we must begin for the next step
  stepStart = 0;

  // The current step index
  step = 0;

  // Percentage of progression that must be done each 0.01 sec
  marge = getMarge();

  // Checker for the progress state (running or not)
  isPaused = true;

  // Checker for the sound (mute or not)
  isSound = true;

  // Init the subtitle at launch
  setSubTitle(meeting.getSequence(0).title);

  initProgressionMainProperties();
}

/**
 * Get the progression marge for the bar according to the time needed
 *
 * @returns {number}
 */
function getMarge() {
  return 1000 / (totalDuration * 60000);
}

/**
 * Get the total duration of the progress bar according to sequences durations
 *
 * @param {array} seq
 */
function determineTotalDuration(seq) {
  let total = 0;
  for (let i in seq) {
    total += seq[i].duration;
  }

  return total;
}

function percent(d) {
  return parseFloat((d * 100 / totalDuration).toFixed(1));
}

/**
 * Split the progress bar into sequences according to the duration of each one
 */
function setSequenceSize() {
  totalDuration = determineTotalDuration(meeting.getSequences()) || 0;
  let beginAt = 0;
  for (let i in meeting.getSequences()) {
    let sequence = meeting.getSequence(i);
    sequence.durationPercent = percent(sequence.duration);
    sequence.beginAt = beginAt;
    sequence.endAt = beginAt + sequence.duration;
    beginAt += sequence.duration;
  }
}

/**
 * Launch the progress bar
 * : reduce the bar width from 100 to 0
 */
function progress() {
  if (!isPaused) {
    /* 0 < width < 100 */
    if (width <= 0) {
      clearInterval(interval);
    } else {
      width = width - marge;
      time += 10;
      bar.style.width = width + "%";
      //updateTime(width);
      updateRemainingTime(width);
      // Only used in case of percentage progression instead of time
      //updatePercent(width);

      /* parseFloat((100 - (width + stepStart)).toFixed(1)) is equal to the percentage of the current progression */
      if (
        meeting.getSequence(step).durationPercent ===
        parseFloat((100 - (width + stepStart)).toFixed(1))
      ) {
        updateBar();
        playSound();
        //stop();
      }
    }
  }
}

// UPDATE UI -------------------------------------------------

/**
 * Redefine the page subtitle with the current sequence name
 *
 * @param {string} seqName
 */
function setSubTitle(seqName) {
  const title = document.querySelector("#subtitle");
  title.style.display = "none";
  title.innerHTML = seqName;
  setTimeout(function() {
    title.style.display = "block";
  }, 100);
}

/**
 * Define the page extra content
 * : Hide the container if no param defined
 *
 * @param {string} str
 */
function setExtra(str) {
  const extra = document.querySelector("#extra");
  extra.style.display = "none";

  if (str) {
    extra.innerHTML = str;
    setTimeout(function() {
      extra.style.display = "block";
    }, 100);
  }
}

/**
 * Define the current date and display it in #date node
 *
 */
function setDate() {
  const currentDate = new Date();
  let day = currentDate.getDate();
  let month = currentDate.getMonth() + 1;
  const year = currentDate.getFullYear();

  if (day < 10) {
    day = "0" + day;
  }

  if (month < 10) {
    month = "0" + month;
  }
  const today = `${day}/${month}/${year}`;

  const date = document.querySelector("#date");
  date.innerHTML = today;
}

/**
 * Update progress bar properties
 *
 */
function updateBar() {
  stepStart += meeting.getSequence(step).durationPercent;
  step++;

  if (meeting.getSequence(step)) {
    setSubTitle(meeting.getSequence(step).title);
    if (meeting.getSequence(step).extra) {
      setExtra(meeting.getSequence(step).extra);
    } else {
      setExtra();
    }
  } else {
    setSubTitle("Finished !");
  }
}

/**
 * Update total progression node value (with percent value)
 * : append percent progression
 *
 * @param {number} p
 */
function updatePercent(p) {
  totalProgression.innerHTML = `${(100 - p).toFixed(1)}%`;
}

/**
 * Update total progression node value
 * : append remaining time
 *
 * @param {number} p
 */
function updateTime(p) {
  let total = (totalDuration * 0.6 * (100 - p)).toFixed(0);
  totalProgression.innerHTML = `${total}s`;
}

/**
 * Update remaining progression node value
 * : append time progression
 *
 * @param {number} remainingPercent
 */
function updateRemainingTime(remainingPercent) {
  let remainingTimeInMilli = totalDuration * 600 * remainingPercent;
  remainingTimeInMilli = remainingTimeInMilli.toFixed(0);
  totalProgression.innerHTML = `${timeConversion(remainingTimeInMilli)}`;

  // Compute sequence remaining time
  let elapsedTimeInMilli = totalDuration * 600 * (100 - remainingPercent);
  elapsedTimeInMilli = elapsedTimeInMilli.toFixed(0);
  let endAtInMilli = meeting.getSequence(step).endAt * 60 * 1000;
  endAtInMilli = endAtInMilli.toFixed(0);
  let setRemainInMilli = endAtInMilli - elapsedTimeInMilli;
  sequenceProgression.innerHTML = `${timeConversion(setRemainInMilli)}`;
}

/**
 * Convert milliseconds to user readable time
 *
 * @param {number} millisec
 * @returns {string}
 */
function timeConversion(millisec) {
  let remainingSeconds = millisec / 1000;
  let hours = Math.floor(remainingSeconds / (60 * 60));
  remainingSeconds = remainingSeconds - hours * (60 * 60);
  let minutes = Math.floor(remainingSeconds / 60);
  remainingSeconds = remainingSeconds - minutes * 60;
  const seconds = Math.floor(remainingSeconds);

  let timeString = "";
  if (hours > 0) {
    timeString += hours + ":";
  }
  if (hours > 0 || minutes > 0) {
    if (minutes < 10) {
      timeString += "0";
    }
    timeString += minutes + ":";
  }
  if (seconds < 10) {
    timeString += "0";
  }
  timeString += seconds;
  return timeString;
}

// PROGRESSION MOVE -------------------------------------------------

/**
 * Move the progress bar current time to a new defined sequence
 *
 * @param {number} s
 * @param {boolean} force
 */
function goToStep(s, force) {
  if (!isPaused) toggleStartPause(true);

  if (s === 0) {
    /* If step 1 running go back to step one begin*/
    if (width < 100 - meeting.getSequence(1).durationPercent && !force) {
      stepStart = meeting.getSequence(s).durationPercent;
      s = step;
      /* Else refresh to the begining */
    } else {
      stepStart = 0;
    }
  } else {
    if (step < s) {
      stepStart += meeting.getSequence(step).durationPercent;
    } else {
      /* If step not finished, refresh it instead of going back */
      if (width !== 100 - stepStart) {
        s = step;
      } else {
        stepStart -= meeting.getSequence(step - 1).durationPercent;
      }
    }
  }

  step = s;
  width = 100 - stepStart;
  bar.style.width = width + "%";
  updateRemainingTime(width);

  if (meeting.getSequence(step)) {
    setSubTitle(meeting.getSequence(step).title);

    if (meeting.getSequence(step).extra) {
      setExtra(meeting.getSequence(step).extra);
    } else {
      setExtra();
    }
  }
}

/**
 * Return to our timer previous sequence
 */
function previousStep() {
  if (step !== 0) {
    goToStep(step - 1);
  } else {
    // when on first step
    // just go back to begining
    goToStep(0, true);
  }
}

/**
 * Go to our timer next sequence
 */
function nextStep() {
  const nbStep = meeting.getSequences().length;
  if (step !== nbStep) {
    goToStep(step + 1);
  }
}

/**
 * Manage the time bar progression (start/pause)
 * Also redefine the start button content text
 *
 */
function toggleStartPause(v) {
  if (v) {
    isPaused = v;
  } else {
    isPaused = !isPaused;
  }

  const startText = document.querySelector("#startText");

  if (isPaused) {
    startText.innerHTML = "Start";
  } else {
    startText.innerHTML = "Pause";
  }
}

/**
 * Clear our timer
 *
 */
function stop() {
  clearInterval(interval);
}

/**
 * Restart timer (go to the first sequence)
 *
 */
function restart() {
  goToStep(0, true);
}


// SETTINGS VIEW -------------------------------------------------

/**
 * Open new settings view modal
 *
 */
function openSettings() {
  document.querySelector('#settingsModal').style.display = "flex";
}

/**
 * Close new settings view modal
 *
 */
function closeSettings() {
  document.querySelector('#settingsModal').style.display = "none";
}

/**
 * Create a new meeting using new meeting view elements
 *
 * @param {string} title
 * @param {array} sequences
 * @returns {Meeting} newMeeting
 */
function createMeeting(title, sequences) {
  const newMeeting = new Meeting();

  if(sequences) {
    if(title) {
      newMeeting.setTitle(title);
    }

    // Create and add sequences
    const j = sequences.childElementCount;
    for(let i=0; i<j; i++) {
      const child = sequences.children[i];
      const kind = child.dataset.kind;
      const inputs = child.children;
      const seqName = inputs[0].value;
      const seqDuration = parseFloat(inputs[1].value);
      const seqColor = inputs[2].value;
      // Create the new sequence object
      const seq = new Sequence(seqName, seqDuration, seqColor)
      // Add it to our new meeting
      newMeeting.addSequence(seq);
      //console.log("Sequence added : "+seqName);
    }
  }

  return newMeeting;
}

/**
 * Set a new meeting from our settings view and refresh the page accordingly
 * Close the settings view when done
 *
 */
function applyForNewMeeting() {
  // Get new meeting modal values
  const title = document.querySelector('#new-meeting-title').value;
  const sequences = document.querySelector('#new-meeting-sequences');

  // Create the new meeting object
  meeting = createMeeting(title, sequences);

  // FIXME - Should check the whole defined time instead of just one sequence
  if(meeting.getSequences().length && (meeting.getSequence(0).duration > 0)) {
    // Reset the page
    setPage();
    // Close settings view
    closeSettings();
  }
}

/**
 *  Add a new step form in meeting settings view
 * : If seq defined, set node properties
 * @param {object} seq
 */
function addSeqForm(seq) {
  // Get imported files
  const htmlImport = document.querySelector('link[rel="import"]');
  const htmlDoc = htmlImport.import;

  const sequencesNode = document.querySelector('#new-meeting-sequences');
  const tmpl = htmlDoc.querySelector("#sequenceTmpl").content;
  const elem = tmpl.cloneNode(true);

  if(seq) {
    elem.querySelector('.table-line-title').value = seq.title ? seq.title : "New sequence";
    elem.querySelector('.table-line-duration').value = seq.duration ? seq.duration : 1;
    elem.querySelector('.table-line-color').value = seq.color ? seq.color : "red";
  }

  sequencesNode.appendChild(elem);

  // Add node reference to sequence form array;
  sequenceForm.push(elem);
}

/**
 * Refresh settings view according to loaded JSON
 *
 * @param {any} meetingName
 */
function refreshSettingsView(meetingName) {
  const refresh = function() {
    // Clear setting view without refreshing it
    clearSettings(true);

    // Set settings view title value
    document.querySelector('#new-meeting-title').value = meeting.getTitle();

    const sequences = meeting.getSequences();
    sequences.forEach(function(seq) {
      addSeqForm(seq);
    })
  }

  // Reload meeting without refreshing the page (set meeting global object)
  loadMeetingFromJson(meetingName, refresh);
}

/**
 * Clear settings view
 * : Avoid refresh if needed
 * @param {any} noRefresh
 */
function clearSettings(noRefresh) {
  // Clear title
  const title = document.querySelector('#new-meeting-title');
  title.value = "";

  // Clear sequences
  sequenceForm = [];
  const sequences = document.querySelector('#new-meeting-sequences');
  sequences.innerHTML = "";

  if(!noRefresh) {
    // Reset selected template list
    document.querySelector('#meeting_dropdown').selectedIndex = 0;

    title.value = "New meeting";
    addSeqForm();
  }
}

/**
 * Remove step form from meeting settings view
 *
 */
function removeSeqForm(e) {
  //const sequences = document.querySelector('#new-meeting-sequences');
  //sequences.removeChild(i);
  const elem = e.target.parentElement;
  const parent = document.querySelector('#new-meeting-sequences');

  const i = Array.prototype.indexOf.call(parent.children, elem);
  sequenceForm.splice(i, 1);

  parent.removeChild(elem);
}

// SOUND -------------------------------------------------

/**
 * Launch a sound once
 *
 */
function playSound(){
  if(isSound) {
    const sound = document.querySelector('#sound');
    sound.play();
  }
}

/**
 * Toggle sound and set sound icon
 *
 */
function toggleSound() {
  isSound = !isSound;

  const soundManager = document.querySelector('#soundManager');
  if(isSound) {
    soundManager.setAttribute("src", "assets/icons/ic_volume_up.svg");
  } else {
    soundManager.setAttribute("src", "assets/icons/ic_volume_off.svg");
  }
}

// EVENTS / SHORTCUTS -------------------------------------------------

/**
 * This function is called on a document key_up
 * Code the shortcuts here
 */
function doc_keyUp(event) {
  /* Those key values have been tested on MAC OS */
  const KEY_SPACE = 32;
  const KEY_LEFT = 37;
  const KEY_RIGHT = 39;

  console.log("You pressed", event.keyCode);
  if (event.keyCode == KEY_SPACE) {
    ///
    // SPACE toggle start/pause
    ///
    // We must prevent SPACE default behavior
    // because if we don't SPACE bar will also push on any selected element
    // For example, if START button is selected, you push SPACE then
    // toggleStartPause is called
    // then button is pushed by the event chain and
    // then timer is toggled another time
    event.preventDefault();
    // And at last, toggle the clock
    toggleStartPause();
  } else if (event.keyCode == KEY_LEFT) {
    previousStep();
  } else if (event.keyCode == KEY_RIGHT) {
    nextStep();
  }
}

/* Register page shortcuts */
document.addEventListener("keyup", doc_keyUp, false);

/* Create the progress bar when them DOM has been initialised */
document.addEventListener('DOMContentLoaded', function() {
  init();

  // Bind module functions to window because of the scoped module
  window.toggleStartPause = toggleStartPause;
  window.loadMeetingFromJson = loadMeetingFromJson;
  window.nextStep = nextStep;
  window.previousStep = previousStep;
  window.restart = restart;
  window.addSeqForm = addSeqForm;
  window.removeSeqForm = removeSeqForm;
  window.applyForNewMeeting = applyForNewMeeting;
  window.openSettings = openSettings;
  window.closeSettings = closeSettings;
  window.toggleSound = toggleSound;
  window.refreshSettingsView = refreshSettingsView;
  window.clearSettings = clearSettings;
});
