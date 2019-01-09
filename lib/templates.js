"use strict";

const DEFAULT_ROOM = {
  room:true,
  beforeEnter:NULL_FUNC,
  beforeEnterFirst:NULL_FUNC,
  afterEnter:NULL_FUNC,
  afterEnterFirst:NULL_FUNC,
  onExit:NULL_FUNC,
  visited:0,
  
  lightSource:function() { return LIGHT_FULL; },

  description:function() {
    if (game.dark) {
      printOrRun(game.player, this, "darkDesc");
      return true;
    }
    for (var i = 0; i < ROOM_TEMPLATE.length; i++) {
      if (ROOM_TEMPLATE[i] === "%") {
        printOrRun(game.player, this, "desc");
      }
      else {
        msg(ROOM_TEMPLATE[i]);
      }
    }
    return true;
  },
  
  darkDescription:function() {
    msg("It is dark.");
  },
  
  getContents:function() {
    var list = [];
    for (var key in w) {
      if (w[key].isAtLoc(this.name) && w[key].display >= DSPY_SCENERY) {
        list.push(w[key]);
      }
    }
    return list;
  },
};


const DEFAULT_ITEM = {
  display:DSPY_DISPLAY,
  
  pronouns:PRONOUNS.thirdperson,
  
  // Used in speak to
  isTopicVisible:function() { return false; },
  lightSource:function() { return LIGHT_NONE; },
  testKeys:function(char, toLock) { return false; },

  icon:function() {
    return "";
  },
  
  getVerbs:function() {
    return ['Examine'];
  },
};


const TAKEABLE_DICTIONARY = {
  getVerbs:function() {
    if (this.loc === game.player.name) {
      return ['Examine', 'Drop'];
    }
    else {
      return ['Examine', 'Take'];
    }
  },

  takeable:true,
  
  drop:function(isMultiple, char) {
    msg(prefix(this, isMultiple) + CMD_DROP_SUCCESSFUL(char, this));
    this.loc = w[char.loc].name;
    return true;
  },
  
  take:function(isMultiple, char) {
    if (this.loc === char.name) {
      msg(prefix(this, isMultiple) + CMD_ALREADY_HAVE(char, this));
      return false;
    };

    msg(prefix(this, isMultiple) + CMD_TAKE_SUCCESSFUL(char, this));
    this.loc = char.name;
    if (this.display === DSPY_SCENERY) {
      this.display = DSPY_DISPLAY;
    }
    return true;
  },
  
};


const TAKEABLE = function() {
  return TAKEABLE_DICTIONARY;
}



const COUNTABLE = function(locs) {
  var res = $.extend({}, TAKEABLE_DICTIONARY);
  //var res = TAKEABLE_DICTIONARY;
  res.countable = true;
  res.locs = locs;
  
  res.extractNumber = function() {
    var md = /^(\d+)/.exec(this.cmdMatch);
    if (!md) { return false; }
    return parseInt(md[1]);
  }

  res.byname = function(options) {
    var s = "";
    var count = options.loc ? this.countAtLoc(options.loc) : false;
    if (options.count) {
      count = options.count;
      s = toWords(count) + " ";
    }
    else if (options.article === "the") {
      s = "the ";
    }
    else if (options.article === "a") {
      if (count) {
        s = count === 1 ? "a " : toWords(count) + " ";
      }
      else {
        s = "some ";
      }
    }
    if (count === 1) {
      s += this.alias;
    }
    else if (this.pluralAlias) {
      s += this.pluralAlias;
    }
    else {
      s += this.alias + "s";
    }
    return s;
  };
  
  res.getListAlias = function(loc) {
    return (this.pluralAlias ? this.pluralAlias : this.listalias + "s") + " (" + this.countAtLoc(loc) + ")";
  };
  
  res.isAtLoc = function(loc) {
    if (!this.locs[loc]) { return false; }
    return (this.locs[loc] > 0);
  };

  res.countAtLoc = function(loc) {
    if (!this.locs[loc]) { return 0; }
    return this.locs[loc];
  };
  
  res.resolveNames = function() {
    if (!this.alt) { this.alt = []; }
    if (!this.pluralAlias) { this.pluralAlias = this.alias + "s"; }
    if (!this.alt.includes(this.pluralAlias)) {
      this.alt.push(this.pluralAlias);
    }
  }
  
  res.moveFromTo = function(fromLoc, toLoc, count) {
    debugmsg("fromLoc=" + fromLoc);
    debugmsg("toLoc=" + toLoc);
    debugmsg("this.locs=" + listProperties(this.locs));
    this.locs[fromLoc] -= count;
    if (this.locs[fromLoc] <= 0) { delete this.locs[fromLoc]; }
    if (!this.locs[toLoc]) { this.locs[toLoc] = 0; }
    this.locs[toLoc] += count;
  }
  
  res.take = function(isMultiple, char) {
    var n = this.extractNumber();
    var m = this.countAtLoc(char.loc);
    if (m === 0) {
      msg(prefix(this, isMultiple) + CMD_NONE_THERE(char, this));
      return false;
    }

    if (!n) { n = m; }  // no number specified
    if (n > m)  { n = m; }  // too big number specified
    
    msg(prefix(this, isMultiple) + CMD_TAKE_SUCCESSFUL(char, this, n));
    this.moveFromTo(char.loc, char.name, n);
    if (this.display === DSPY_SCENERY) {
      this.display = DSPY_DISPLAY;
    }
    return true;
  }

  res.drop = function(isMultiple, char) {
    var n = this.extractNumber();
    var m = this.countAtLoc(char.name);
    if (m === 0) {
      msg(prefix(this, isMultiple) + CMD_NONE_HELD(char, this));
      return false;
    }

    if (!n) { n = m; }  // no number specified
    if (n > m)  { n = m; }  // too big number specified
    
    msg(prefix(this, isMultiple) + CMD_DROP_SUCCESSFUL(char, this, n));
    this.moveFromTo(char.name, char.loc, n);
    return true;
  }

  return res;
};



const WEARABLE = function() {
  var res = $.extend({}, TAKEABLE_DICTIONARY);
  //var res = TAKEABLE_DICTIONARY;
  res.wearable = true;
  
  res.getVerbs = function() {
    if (this.loc === game.player.name) {
      return this.worn ? ['Examine', 'Remove'] : ['Examine', 'Drop', 'Wear'];
    }
    else {
      return ['Examine', 'Take'];
    }
  },

  res.icon = function() {
    return ('<img src="images/garment12.png" />');
  };
  
  res.wear = function(isMultiple, char) {
    msg(prefix(this, isMultiple) + CMD_WEAR_SUCCESSFUL(char, this));
    this.loc = char.name;
    this.worn = true;
    return true;
  };
  
  res.remove = function(isMultiple, char) {
    msg(prefix(this, isMultiple) + CMD_REMOVE_SUCCESSFUL(char, this));
    this.loc = char.name;
    this.worn = false;
    return true;
  };

  res.byname = function(options) {
    var s = "";
    if (options.article === "the") {
      s = _itemThe(this);
    }
    if (options.article === "a") {
      s = _itemA(this);
    }
    s += this.alias;
    if (this.worn && options.modified && (this.loc === game.player.name)) { s += " (worn)"; }
    return s;
  };

  return res;
};




const CONTAINER = function(alreadyOpen) {
  var res = {};
  res.container = true;
  res.closed = !alreadyOpen;
  res.openable = true;
  res.listPrefix = "containing ";
  res.listSuffix = "";
  
  res.getVerbs = function() {
    var arr = ['Examine'];
    if (this.takeable) {
      arr.push(this.loc === game.player.name ? 'Drop' : 'Take');
    }
    arr.push(this.closed ? 'Open' : 'Close');
    return arr;
  },

  res.byname = function(options) {
    var prefix = "";
    if (options.article === "the") {
      prefix = _itemThe(this);
    }
    if (options.article === "a") {
      prefix = _itemA(this);
    }
    var contents = this.getContents();
    if (contents.length === 0 || !options.modified) {
      return prefix + this.alias
    }
    else {
      return prefix + this.alias + " (" + this.listPrefix + formatList(contents, {article:"a", lastJoiner:" and ", modified:true, nothing:"nothing", loc:this.name}) + this.listSuffix + ")";
    }
  };
  
  res.getContents = function() {
    var list = [];
    for (var key in w) {
      if (w[key].isAtLoc(this.name) && w[key].display >= DSPY_SCENERY) {
        list.push(w[key]);
      }
    }
    return list;
  };
  
  res.open = function(isMultiple, char) {
    if (!this.openable) {
      msg(prefix(this, isMultiple) + CMD_CANNOT_OPEN(char, this));
      return false;
    }
    else if (!this.closed) {
      msg(prefix(this, isMultiple) + CMD_ALREADY(char, this));
      return false;
    }
    if (this.locked) {
      if (this.testKeys(char)) {
        this.closed = false;
        msg(prefix(this, isMultiple) + CMD_UNLOCK_SUCCESSFUL(char, this));
        msg(prefix(this, isMultiple) + CMD_OPEN_SUCCESSFUL(char, this));
        return true;
      }
      else {
        msg(prefix(this, isMultiple) + CMD_LOCKED(char, this));
        return false;
      }
    }
    this.closed = false;
    msg(prefix(this, isMultiple) + CMD_OPEN_SUCCESSFUL(char, this));
    return true;
  };
  
  res.close = function(isMultiple, char) {
    if (!this.openable) {
      msg(prefix(this, isMultiple) + CMD_CANNOT_CLOSE(char, this));
      return false;
    }
    else if (this.closed) {
      msg(prefix(this, isMultiple) + CMD_ALREADY(char, this));
      return false;
    }
    this.hereVerbs = ['Examine', 'Open'];
    this.closed = true;
    msg(prefix(this, isMultiple) + CMD_CLOSE_SUCCESSFUL(char, this));
    return true;
  };
  
  res.icon = function() {
    return ('<img src="images/' + (this.closed ? 'closed' : 'opened') + '12.png" />');
  };
  
  res.canReachThrough = function() { return !this.closed; };
  res.canSeeThrough = function() { return !this.closed || this.transparent; };

  return res;
};


const SURFACE = function() {
  var res = {};
  res.container = true;
  res.listPrefix = "holding ";
  res.listSuffix = "";
  res.byname = CONTAINER().byname;
  res.getContents = CONTAINER().getContents;
  res.listPrefix = "with ";
  res.listSuffix = " on it";
  res.canReachThrough = function() { return true; };
  res.canSeeThrough = function() { return true; };
  return res;
}


const OPENABLE = function(alreadyOpen) {
  var res = {};
  res.container = true;
  res.closed = !alreadyOpen;
  res.openable = true;
  res.listPrefix = "containing ";
  res.listSuffix = "";
  
  res.getVerbs = function() {
    var arr = ['Examine'];
    if (this.takeable) {
      arr.push(this.loc === game.player.name ? 'Drop' : 'Take');
    }
    arr.push(this.closed ? 'Open' : 'Close');
    return arr;
  },

  res.byname = function(options) {
    var s = "";
    if (options.article === "the") {
      s = _itemThe(this);
    }
    if (options.article === "a") {
      s = _itemA(this);
    }
    s += this.alias;
    if (!this.closed && options.modified) { s += " (open)"; }
    return s;
  };

  res.open = CONTAINER().open;
  res.close = CONTAINER().close;
  return res;
}


const LOCKED_WITH = function(keyNames) {
  if (typeof keyNames === "string") { keyNames = [keyNames]; }
  if (keyNames === undefined) { keyNames = []; }
  var res = {
    keyNames:keyNames,
    locked:true,
    lock:function(isMultiple, char) {
      if (this.locked) {
        msg(CMD_ALREADY(char, this));
        return false;
      }
      if (!this.testKeys(char, true)) {
        msg(CMD_NO_KEY(char, this));
        return false;
      }
      if (!this.closed) {
        this.closed = true;
        msg(CMD_CLOSE_SUCCESSFUL(char, this));
      }      
      msg(CMD_LOCK_SUCCESSFUL(char, this));
      this.locked = true;
      return true;
    },
    unlock:function(isMultiple, char) {
      if (!this.locked) {
        msg(CMD_ALREADY(char, this));
        return false;
      }
      if (!this.testKeys(char, false)) {
        msg(CMD_NO_KEY(char, this));
        return false;
      }
      msg(CMD_UNLOCK_SUCCESSFUL(char, this));
      this.locked = false;
      return true;
    },
    testKeys:function(char, toLock) {
      for (var i = 0; i < keyNames.length; i++) {
        if (!w[keyNames[i]]) {
          errormsg(ERR_GAME_BUG, ERROR_UNKNOWN_KEY(keyNames[i]));
          return false;
        }
        if (w[keyNames[i]].loc === char.name) { 
          return true; 
        }
      }
      return false;
    }
  };
  return res;
}


const SWITCHABLE = function(alreadyOn) {
  var res = {};
  res.switchedon = alreadyOn;
  
  res.getVerbs = function() {
    var arr = ['Examine'];
    if (this.takeable) {
      arr.push(this.loc === game.player.name ? 'Drop' : 'Take');
    }
    arr.push(this.switchedon ? 'Turn off' : 'Turn on');
    return arr;
  };

  res.switchon = function(isMultiple, char) {
    if (this.switchedon) {
      msg(prefix(this, isMultiple) + CMD_ALREADY(char, this));
      return false;
    }
    if (!this.checkCanSwitchOn()) {
      return false;
    }
    msg(CMD_TURN_ON_SUCCESSFUL(char, this));
    this.doSwitchon();
    return true;
  };
  res.doSwitchon = function() {
    var lighting = game.dark;
    this.switchedon = true;
    game.update();
    if (lighting !== game.dark) {
      game.room.description();
    }
  };
  res.checkCanSwitchOn = function() { return true; }
  
  res.switchoff = function(isMultiple, char) {
    if (!this.switchedon) {
      msg(prefix(this, isMultiple) + CMD_ALREADY(char, this));
      return false;
    }
    msg(CMD_TURN_OFF_SUCCESSFUL(char, this));
    this.doSwitchoff();
    return true;
  };
  res.doSwitchoff = function() {
    var lighting = game.dark;
    this.switchedon = false;
    game.update();
    if (lighting !== game.dark) {
      game.room.description();
    }
  };

  return res;
};


// Ideally Quest will check components when doing a command for the whole
// I think?

const COMPONENT = function(nameOfWhole) {
  var res = {
    display:DSPY_SCENERY,
    component:true,
    loc:nameOfWhole,
    takeable:true, // Set this as it has its own take attribute
    isAtLoc:function(loc) {
      var cont = w[this.loc];
      if (cont.loc === loc) { return true; }
      return cont.isAtLoc(loc);
    },
    take:function(isMultiple, char) {
      msg(prefix(this, isMultiple) + CMD_CANNOT_TAKE_COMPONENT(char, this));
      return false;
    },
  }
  return res;
}


const PLAYER = {
  pronouns:PRONOUNS.secondperson,
  display:DSPY_SCENERY,
  player:true,
  canReachThrough:function() { return true; },
  canSeeThrough:function() { return true; },
  getAgreement:function() { return true; },
  getContents:CONTAINER().getContents,
}

const TURNSCRIPT = function(isRunning, fn) {
  var res = {
    display:DSPY_HIDDEN,
    runTurnscript:function() { return this.isRunning; },
    isRunning:isRunning,
    turnscript:fn,
  }
  return res;
};



const NPC = function(isFemale) {
  var res = {
    npc:true,
    pronouns:isFemale ? PRONOUNS.female : PRONOUNS.male,
    speaktoCount:0,
    askoptions:[],
    telloptions:[],
    excludeFromAll:true,
    canReachThrough:function() { return false; },
    canSeeThrough:function() { return true; },
    getContents:CONTAINER().getContents,
    
    getVerbs:function() {
      return ['Look at', 'Talk to'];
    },
    
    icon:function() {
      return ('<img src="images/npc12.png" />');
    },
  };

  res.getAgreement = function(cmdName, item) {
    return true;
  };
  
  res.heading = function(dir) {
    return NPC_HEADING(this, dir);
  };

  res.getHolding = function() {
    return this.getContents().filter(function(el) { return !el.worn; });
  };
  
  res.getWearing = function() {
    return this.getContents().filter(function(el) { return el.worn; });
  };
  
  
  res.byname = function(options) {
    var s = this.alias;
    if (options.article === "the") {
      s = _itemThe(this) + this.alias;
    }
    if (options.article === "a") {
      s = _itemA(this) + this.alias;
    }
    if (this.getContents().length === 0 || !options.modified) {
      return s;
    }
    if (this.getHolding().length === 0 || !options.modified) {
      return s + " (wearing " + formatList(this.getWearing(), {article:"a", lastJoiner:" and ", modified:true, nothing:"nothing", loc:this.name}) + ")";
    }
    if (this.getWearing().length === 0 || !options.modified) {
      return s + " (holding " + formatList(this.getHolding(), {article:"a", lastJoiner:" and ", modified:true, nothing:"nothing", loc:this.name}) + ")";
    }
    s += " (holding " + formatList(this.getHolding(), {article:"a", lastJoiner:" and ", nothing:"nothing", loc:this.name}) + ", and ";
    s += "wearing " + formatList(this.getWearing(), {article:"a", lastJoiner:" and ", nothing:"nothing", loc:this.name}) + ")";
    return s;
  };
  
  res.askabout = function(text) {
    if (checkCannotSpeak(this)) {
      return false;
    }
    msg("You ask " + this.name + " about " + text + ".");
    for (var i = 0; i < this.askoptions.length; i++) {
      if (this.askoptions[i].regex.test(text)) {
        printOrRun(game.player, this, this.askoptions[i].response);
        return true;
      }
    }
    msg(nounVerb(this, "have", true) + " nothing to say on the subject.");
    return false;
  };
  res.tellabout = function(text) {
    if (checkCannotSpeak(this)) {
      return false;
    }
    msg("You tell " + this.name + " about " + text + ".");
    for (var i = 0; i < this.telloptions.length; i++) {
      if (this.telloptions[i].regex.test(text)) {
        printOrRun(game.player, this, this.telloptions[i].response);
        return true;
      }
    }
    msg(nounVerb(this, "have", true) + " no interest in that subject.");
    return false;
  };

  res.speakto = function() {
    if (checkCannotSpeak(this)) {
      return false;
    }
    var topics = this.getContents(this).filter(el => el.isTopicVisible());  // does getContents work here?
    topics.push(NEVER_MIND);
    showMenu("Talk to " + this.byname({article:"the"}) + " about:", topics, function(result) {
      if (result !== NEVER_MIND) {
        result.runscript();
      }
    });
    
    return false;
  };
  res.talkto = function() {
    printOrRun(game.player, this, "speakto");
    this.speaktoCount++;
  };
  return res;
};


const TOPIC = function(fromStart) {
  var res = {
    conversationTopic:true,
    display:DSPY_HIDDEN,
    showTopic:fromStart,
    hideTopic:false,
    hideAfter:true,
    nowShow:[],
    nowHide:[],
    runscript:function() {
      this.script();
      this.hideTopic = this.hideAfter;
      for (var i = 0; i < this.nowShow.length; i++) {
        var obj = w[this.nowShow[i]];
        obj.showTopic = true;
      };
      for (var i = 0; i < this.nowHide.length; i++) {
        var obj = w[this.nowHide[i]];
        obj.hideTopic = true;
      };
    },
    isTopicVisible:function() {
      return this.showTopic && !this.hideTopic;
    }
  };
  return res;
};