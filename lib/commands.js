// A command has an arbitrary name, a regex or pattern,
// and a script as a minimum.
// regex           A regex to match against
// objects         An array of matches in the regex (see wiki)
// script          This will be run on a successful match
// attName         If there is no script, then this attribute on the object will be used
// nothingForAll   If the player uses ALL and there is nothing there, use this error message
// noTurnscripts   Set to true to prevent turnscripts firing even when this command is successful

'use strict'
import { lang, Cmd, game, util, io, settings, saveLoad, w, parser, cmdRules } from './main'

const cmdDirections = []
for (const exit of lang.exit_list) {
  if (exit.nocmd) continue
  cmdDirections.push(exit.name)
  cmdDirections.push(exit.abbrev.toLowerCase())
  if (exit.alt) cmdDirections.push(exit.alt)
}

const commands = [
  // ----------------------------------
  // Single word commands

  // Cannot just set the script to helpScript as we need to allow the
  // author to change it in code.js, which is loaded after this.
  new Cmd('MetaHelp', { // -fixme: call of "new" is ignored when not calling a JS6 class-
    script: lang.helpScript
  }),
  new Cmd('MetaCredits', {
    script: lang.aboutScript
  }),

  new Cmd('MetaSpoken', {
    script: function () {
      game.spoken = true
      io.metamsg(lang.spoken_on)
      return util.SUCCESS_NO_TURNSCRIPTS
    }
  }),
  new Cmd('MetaIntro', {
    script: function () {
      game.spoken = true
      if (typeof settings.intro === 'string') io.msg(settings.intro)
      return util.util.SUCCESS_NO_TURNSCRIPTS
    }
  }),
  new Cmd('MetaUnspoken', {
    script: function () {
      game.spoken = false
      io.metamsg(lang.spoken_off)
      return util.util.SUCCESS_NO_TURNSCRIPTS
    }
  }),
  new Cmd('MetaBrief', {
    script: function () {
      game.verbosity = util.BRIEF
      io.metamsg(lang.mode_brief)
      return util.util.SUCCESS_NO_TURNSCRIPTS
    }
  }),
  new Cmd('MetaTerse', {
    script: function () {
      game.verbosity = util.TERSE
      io.metamsg(lang.mode_terse)
      return util.util.SUCCESS_NO_TURNSCRIPTS
    }
  }),
  new Cmd('MetaVerbose', {
    script: function () {
      game.verbosity = util.VERBOSE
      io.metamsg(lang.mode_verbose)
      return util.util.SUCCESS_NO_TURNSCRIPTS
    }
  }),

  new Cmd('MetaTranscript', {
    script: lang.transcriptScript
  }),
  new Cmd('MetaTranscriptOn', {
    script: function () {
      if (game.transcript) {
        io.metamsg(lang.transcript_lang.already_on)
        return util.FAILED
      }
      game.scriptStart()
      return util.util.SUCCESS_NO_TURNSCRIPTS
    }
  }),
  new Cmd('MetaTranscriptOff', {
    script: function () {
      if (!game.transcript) {
        io.metamsg(lang.transcript_lang.already_off)
        return util.FAILED
      }
      game.scriptEnd()
      return util.util.SUCCESS_NO_TURNSCRIPTS
    }
  }),
  new Cmd('MetaTranscriptClear', {
    script: function () {
      game.scriptClear()
      return util.util.SUCCESS_NO_TURNSCRIPTS
    }
  }),
  new Cmd('MetaTranscriptShow', {
    script: function () {
      game.scriptShow()
      return util.util.SUCCESS_NO_TURNSCRIPTS
    }
  }),
  new Cmd('MetaTranscriptShowWithOptions', {
    script: function (arr) {
      game.scriptShow(arr[0])
      return util.util.SUCCESS_NO_TURNSCRIPTS
    },
    objects: [
      { text: true }
    ]
  }),

  // ----------------------------------
  // File system commands
  new Cmd('MetaSave', {
    script: lang.saveLoadScript
  }),
  new Cmd('MetaSaveGame', {
    script: function (arr) {
      saveLoad.saveGame(arr[0])
      return util.util.SUCCESS_NO_TURNSCRIPTS
    },
    objects: [
      { text: true }
    ]
  }),
  new Cmd('MetaLoad', {
    script: lang.saveLoadScript
  }),
  new Cmd('MetaLoadGame', {
    script: function (arr) {
      saveLoad.loadGame(arr[0])
      return util.util.SUCCESS_NO_TURNSCRIPTS
    },
    objects: [
      { text: true }
    ]
  }),
  new Cmd('MetaDir', {
    script: function () {
      saveLoad.dirGame()
      return util.util.SUCCESS_NO_TURNSCRIPTS
    }
  }),
  new Cmd('MetaDeleteGame', {
    script: function (arr) {
      saveLoad.deleteGame(arr[0])
      return util.util.SUCCESS_NO_TURNSCRIPTS
    },
    objects: [
      { text: true }
    ]
  }),

  new Cmd('Undo', {
    script: function () {
      if (settings.maxUndo === 0) {
        io.metamsg(lang.undo_disabled)
        return util.FAILED
      }
      if (game.gameState.length < 2) {
        io.metamsg(lang.undo_not_available)
        return util.FAILED
      }
      game.gameState.pop()
      const gameState = game.gameState[game.gameState.length - 1]
      io.metamsg(lang.undo_done)
      saveLoad.loadTheWorld(gameState)
      w[game.player.loc].description()
    }
  }),

  new Cmd('Look', {
    script: function () {
      game.room.description()
      return settings.lookCountsAsTurn ? util.SUCCESS : util.util.SUCCESS_NO_TURNSCRIPTS
    }
  }),
  new Cmd('world.Exits', {
    script: function () {
      io.msg(lang.can_go())
      return settings.lookCountsAsTurn ? util.SUCCESS : util.util.SUCCESS_NO_TURNSCRIPTS
    }
  }),
  new Cmd('Wait', {
    script: function () {
      io.msg(lang.wait_io.msg)
      return util.SUCCESS
    }
  }),
  new Cmd('TopicsNote', {
    script: lang.topicsScript
  }),

  new Cmd('Inv', {
    script: function () {
      const listOfOjects = game.player.getContents(util.display.ALL)
      io.msg(lang.inventoryPreamble + ' ' + util.formatList(listOfOjects, { article: util.INDEFINITE, lastJoiner: lang.list_and, modified: true, nothing: lang.list_nothing, loc: game.player.name }) + '.')
      return settings.lookCountsAsTurn ? util.SUCCESS : util.util.SUCCESS_NO_TURNSCRIPTS
    }
  }),
  new Cmd('Map', {
    script: function () {
      if (typeof showMap !== 'undefined') {
        //        showMap()
        return settings.lookCountsAsTurn ? util.SUCCESS : util.util.SUCCESS_NO_TURNSCRIPTS
      } else {
        return io.failedio.msg(lang.no_map)
      }
    }
  }),
  new Cmd('Smell', {
    script: function () {
      if (game.room.onSmell) {
        io.printOrRun(game.player, game.room, 'onSmell')
      } else {
        io.msg(lang.no_smell(game.player)) //  -review: Way send a function to the messenger
      } // -review: and not just call the function itselve and that in return calls the messanger?
      return util.SUCCESS
    }
  }),
  new Cmd('Listen', {
    script: function () {
      if (game.room.onListen) {
        io.printOrRun(game.player, game.room, 'onListen')
      } else {
        io.msg(lang.no_listen(game.player))
      }
      return util.SUCCESS
    }
  }),
  new Cmd('PurchaseFromList', {
    script: function () {
      const l = []
      for (const key in w) {
        if (parser.isForSale(w[key])) {
          const price = w[key].getBuyingPrice(game.player)
          const row = [util.sentenCecase(w[key].byname()), util.util.displayMoney(price)]
          row.push(price > game.player.money ? '-' : '{cmd:lang.buy ' + w[key].alias + ':' + lang.buy + '}')
          l.push(row)
        }
      }
      if (l.length === 0) {
        return io.failedio.msg(lang.nothing_for_sale)
      }
      io.msg(lang.current_money + ': ' + util.util.displayMoney(game.player.money))
      io.msgTable(l, lang.buy_headings)
      return util.util.SUCCESS_NO_TURNSCRIPTS
    }
  }),

  // ----------------------------------
  // Verb-object commands
  new Cmd('Examine', {
    objects: [
      { scope: parser.isPresent, multiple: true }
    ],
    defmsg: lang.default_examine
  }),
  new Cmd('LookAt', { // used for NPCs
    attName: 'examine',
    objects: [
      { scope: parser.isPresentOrMe }
    ],
    defmsg: lang.default_examine
  }),
  new Cmd('LookOut', {
    rules: [cmdRules.isHere],
    objects: [
      { scope: parser.isPresent }
    ],
    attName: 'lookout',
    defmsg: lang.cannot_look_out
  }),
  new Cmd('LookBehind', {
    rules: [cmdRules.isHere],
    attName: 'lookbehind',
    objects: [
      { scope: parser.isPresent }
    ],
    defmsg: lang.nothing_there
  }),
  new Cmd('LookUnder', {
    rules: [cmdRules.isHere],
    attName: 'lookunder',
    objects: [
      { scope: parser.isPresent }
    ],
    defmsg: lang.nothing_there
  }),
  new Cmd('LookInside', {
    rules: [cmdRules.isHere],
    attName: 'lookinside',
    objects: [
      { scope: parser.isPresent }
    ],
    defmsg: lang.nothing_inside
  }),
  new Cmd('Search', {
    rules: [cmdRules.isHere],
    attName: 'search',
    objects: [
      { scope: parser.isPresent }
    ],
    defmsg: lang.nothing_there
  }),

  new Cmd('Take', {
    npcCmd: true,
    rules: [cmdRules.isHereNotHeld, cmdRules.canManipulate],
    objects: [
      { scope: parser.isHereOrContained, multiple: true }
    ],
    defmsg: lang.cannot_take
  }),
  new Cmd('Drop', {
    npcCmd: true,
    rules: [cmdRules.isHeldNotWorn, cmdRules.canManipulate],
    objects: [
      { scope: parser.isHeld, multiple: true }
    ],
    defmsg: lang.not_carrying
  }),
  new Cmd('Wear2', {
    npcCmd: true,
    rules: [cmdRules.isHeldNotWorn, cmdRules.isHeld, cmdRules.canManipulate],
    attName: 'wear',
    objects: [
      { scope: parser.isHeld, multiple: true }
    ],
    defmsg: function (char, item) {
      return item.ensemble ? lang.cannot_wear_ensemble(char, item) : lang.cannot_wear(char, item)
    }
  }),
  new Cmd('Wear', {
    npcCmd: true,
    rules: [cmdRules.isHeldNotWorn, cmdRules.canManipulate],
    objects: [
      { scope: parser.isHeld, multiple: true }
    ],
    defmsg: function (char, item) {
      return item.ensemble ? lang.cannot_wear_ensemble(char, item) : lang.cannot_wear(char, item)
    }
  }),
  new Cmd('Remove', {
    npcCmd: true,
    rules: [cmdRules.isWorn, cmdRules.canManipulate],
    objects: [
      { scope: parser.isWorn, multiple: true }
    ],
    defmsg: function (char, item) {
      return item.ensemble ? lang.cannot_wear_ensemble(char, item) : lang.not_wearing(char, item)
    }
  }),
  new Cmd('Remove2', {
    npcCmd: true,
    rules: [cmdRules.isWorn, cmdRules.canManipulate],
    attName: 'remove',
    objects: [
      { scope: parser.isWorn, multiple: true }
    ],
    defmsg: function (char, item) {
      return item.ensemble ? lang.cannot_wear_ensemble(char, item) : lang.not_wearing(char, item)
    }
  }),
  new Cmd('Read', {
    npcCmd: true,
    rules: [cmdRules.isHere],
    objects: [
      { scope: parser.isHeld, multiple: true }
    ],
    defmsg: lang.cannot_read
  }),
  new Cmd('Eat', {
    npcCmd: true,
    rules: [cmdRules.isHeldNotWorn, cmdRules.canManipulate],
    objects: [
      { scope: parser.isHeld, multiple: true, attName: 'ingest' }
    ],
    defmsg: lang.cannot_eat
  }),
  new Cmd('Purchase', {
    npcCmd: true,
    rules: [cmdRules.canManipulate],
    objects: [
      { scope: parser.isForSale }
    ],
    defmsg: lang.cannot_purchase
  }),
  new Cmd('Sell', {
    npcCmd: true,
    rules: [cmdRules.isHeldNotWorn, cmdRules.canManipulate],
    objects: [
      { scope: parser.isHeld, multiple: true }
    ],
    defmsg: lang.cannot_sell
  }),
  new Cmd('Smash', {
    npcCmd: true,
    rules: [cmdRules.canManipulate, cmdRules.isHere],
    objects: [
      { scope: parser.isHeld, multiple: true }
    ],
    defmsg: lang.cannot_smash
  }),
  new Cmd('SwitchOn', {
    npcCmd: true,
    rules: [cmdRules.canManipulate, cmdRules.isHere],
    attName: 'switchon',
    cmdCategory: 'SwitchOn',
    objects: [
      { scope: parser.isHeld, multiple: true }
    ],
    defmsg: lang.cannot_switch_on
  }),
  new Cmd('SwitchOn2', {
    npcCmd: true,
    rules: [cmdRules.canManipulate, cmdRules.isHere],
    attName: 'switchon',
    cmdCategory: 'SwitchOn',
    objects: [
      { scope: parser.isHeld, multiple: true }
    ],
    defmsg: lang.cannot_switch_on
  }),

  new Cmd('SwitchOff2', {
    npcCmd: true,
    rules: [cmdRules.canManipulate, cmdRules.isHere],
    attName: 'switchoff',
    cmdCategory: 'SwitchOff',
    objects: [
      { scope: parser.isHeld, multiple: true, attName: 'switchon' }
    ],
    defmsg: lang.cannot_switch_off
  }),
  new Cmd('SwitchOff', {
    npcCmd: true,
    rules: [cmdRules.canManipulate, cmdRules.isHere],
    attName: 'switchoff',
    cmdCategory: 'SwitchOff',
    objects: [
      { scope: parser.isHeld, multiple: true, attName: 'switchoff' }
    ],
    defmsg: lang.cannot_switch_off
  }),

  new Cmd('Open', {
    npcCmd: true,
    rules: [cmdRules.canManipulate, cmdRules.isHere],
    objects: [
      { scope: parser.isPresent, multiple: true, attName: 'open' }
    ],
    defmsg: lang.cannot_open
  }),

  new Cmd('Close', {
    npcCmd: true,
    rules: [cmdRules.canManipulate, cmdRules.isHere],
    objects: [
      { scope: parser.isPresent, multiple: true, attName: 'close' }
    ],
    defmsg: lang.cannot_close
  }),

  new Cmd('Lock', {
    npcCmd: true,
    rules: [cmdRules.canManipulate, cmdRules.isHere],
    objects: [
      { scope: parser.isPresent, multiple: true, attName: 'lock' }
    ],
    defmsg: lang.cannot_lock
  }),

  new Cmd('Unlock', {
    npcCmd: true,
    rules: [cmdRules.canManipulate, cmdRules.isHere],
    objects: [
      { scope: parser.isPresent, multiple: true, attName: 'unlock' }
    ],
    defmsg: lang.cannot_unlock
  }),

  new Cmd('Push', {
    npcCmd: true,
    rules: [cmdRules.canManipulate, cmdRules.isHere],
    objects: [
      { scope: parser.isPresent }
    ],
    defmsg: lang.nothing_useful
  }),

  new Cmd('Pull', {
    npcCmd: true,
    rules: [cmdRules.canManipulate, cmdRules.isHere],
    objects: [
      { scope: parser.isPresent }
    ],
    defmsg: lang.nothing_useful
  }),
  new Cmd('Fill', {
    npcCmd: true,
    rules: [cmdRules.canManipulate, cmdRules.isHeld],
    objects: [
      { scope: parser.isPresent }
    ],
    defmsg: lang.cannot_fill
  }),
  new Cmd('Empty', {
    npcCmd: true,
    rules: [cmdRules.canManipulate, cmdRules.isHeld],
    objects: [
      { scope: parser.isPresent }
    ],
    defmsg: lang.cannot_empty
  }),

  new Cmd('Eat', {
    npcCmd: true,
    rules: [cmdRules.canManipulate, cmdRules.isHeld],
    objects: [
      { text: true },
      { scope: parser.isPresent, attName: 'ingest' }
    ],
    defmsg: lang.cannot_eat
  }),
  new Cmd('Drink', {
    npcCmd: true,
    rules: [cmdRules.canManipulate, cmdRules.isHeld],
    objects: [
      { text: true },
      { scope: parser.isPresent, attName: 'ingest' }
    ],
    defmsg: lang.cannot_drink
  }),
  new Cmd('Ingest', {
    npcCmd: true,
    rules: [cmdRules.canManipulate, cmdRules.isHeld],
    objects: [
      { text: true },
      { scope: parser.isPresent, attName: 'ingest' }
    ],
    defmsg: lang.cannot_ingest
  }),

  new Cmd('SitOn', {
    npcCmd: true,
    cmdCategory: 'Posture',
    rules: [cmdRules.canPosture, cmdRules.isHereNotHeld],
    attName: 'siton',
    objects: [
      { scope: parser.isHere, attName: 'assumePosture' }
    ],
    defmsg: lang.cannot_sit_on
  }),
  new Cmd('StandOn', {
    npcCmd: true,
    cmdCategory: 'Posture',
    rules: [cmdRules.canPosture, cmdRules.isHereNotHeld],
    attName: 'standon',
    objects: [
      { scope: parser.isHere, attName: 'assumePosture' }
    ],
    defmsg: lang.cannot_stand_on
  }),
  new Cmd('ReclineOn', {
    npcCmd: true,
    cmdCategory: 'Posture',
    rules: [cmdRules.canPosture, cmdRules.isHereNotHeld],
    attName: 'reclineon',
    objects: [
      { scope: parser.isHere, attName: 'assumePosture' }
    ],
    defmsg: lang.cannot_recline_on
  }),
  new Cmd('GetOff', {
    npcCmd: true,
    cmdCategory: 'Posture',
    rules: [cmdRules.canPosture, cmdRules.isHereNotHeld],
    attName: 'getoff',
    objects: [
      { scope: parser.isHere, attName: 'assumePosture' }
    ],
    defmsg: lang.already
  }),

  new Cmd('Use', {
    npcCmd: true,
    rules: [cmdRules.canManipulate, cmdRules.isHere],
    objects: [
      { scope: parser.isPresent, multiple: true }
    ],
    defmsg: lang.cannot_use
  }),

  new Cmd('TalkTo', {
    rules: [cmdRules.canTalkTo],
    attName: 'talkto',
    objects: [
      { scope: parser.isNpcAndHere }
    ],
    default: function (item) {
      return io.failedio.msg(lang.cannot_talk_to(game.player, item))
    }
  }),

  new Cmd('Topics', {
    attName: 'topics',
    objects: [
      { scope: parser.isNpcAndHere }
    ],
    default: function (item) {
      return io.failedio.msg(lang.no_topics(game.player, item))
    }
  }),

  // ----------------------------------
  // Complex commands

  new Cmd('Say', {
    script: function (arr) {
      const l = []
      for (const key in w) {
        if (w[key].sayCanHear && w[key].sayCanHear(game.player, arr[0])) l.push(w[key])
      }
      l.sort(function (a, b) { return (b.sayPriority + b.sayBonus) - (a.sayPriority + b.sayBonus) })
      if (l.length === 0) {
        io.msg(lang.say_no_one_here(game.player, arr[0], arr[1]))
        return util.SUCCESS
      }

      if (settings.givePlayerSayMsg) io.msg(lang.nounVerb(game.player, arr[0], true) + ", '" + util.sentenCecase(arr[1]) + ".'") // <---eww<---
      for (const chr of l) {
        if (chr.sayQuestion && w[chr.sayQuestion].sayResponse(chr, arr[1])) return util.SUCCESS
        if (chr.sayResponse && chr.sayResponse(arr[1], arr[0])) return util.SUCCESS
      }
      if (settings.givePlayerSayMsg) {
        io.msg(lang.say_no_response(game.player, arr[0], arr[1]))
      } else {
        io.msg(lang.say_no_response_full(game.player, arr[0], arr[1])) // <-- Searchers after horror haunt strange, far places...
      }
      return util.SUCCESS
    },
    objects: [
      { text: true },
      { text: true }
    ]
  }),

  new Cmd('Stand', {
    rules: [cmdRules.canPosture],
    script: handleStandUp
  }),
  new Cmd('NpcStand1', {
    rules: [cmdRules.canPosture],
    cmdCategory: 'Posture',
    objects: [
      { scope: parser.isHere, attName: 'npc' }
    ],
    script: handleStandUp
  }),
  new Cmd('NpcStand2', {
    rules: [cmdRules.canPosture],
    cmdCategory: 'Posture',
    objects: [
      { scope: parser.isHere, attName: 'npc' }
    ],
    script: handleStandUp
  }),

  new Cmd('FillWith', {
    rules: [cmdRules.canManipulate, cmdRules.isHeld],
    objects: [
      { scope: parser.isHeld },
      { scope: parser.isLiquid }
    ],
    script: function (objects) {
      return handleFillWithLiquid(game.player, objects[0][0], objects[1][0])
    }
  }),
  new Cmd('NpcFillWith1', {
    rules: [cmdRules.canManipulate, cmdRules.isHeld],
    cmdCategory: 'FillWith',
    objects: [
      { scope: parser.isHere, attName: 'npc' },
      { scope: parser.isHeld },
      { scope: parser.isLiquid }
    ],
    script: function (objects) {
      const npc = objects[0][0]
      if (!npc.npc) {
        io.failedio.msg(lang.not_npc(npc))
        return util.FAILED
      }
      objects.shift()
      return handleFillWithLiquid(npc, objects[0][0], objects[1][0])
    }
  }),
  new Cmd('NpcFillWith2', {
    rules: [cmdRules.canManipulate, cmdRules.isHeld],
    cmdCategory: 'FillWith',
    objects: [
      { scope: parser.isHere, attName: 'npc' },
      { scope: parser.isHeld },
      { scope: parser.isLiquid }
    ],
    script: function (objects) {
      const npc = objects[0][0]
      if (!npc.npc) {
        io.failedio.msg(lang.not_npc(npc))
        return util.FAILED
      }
      objects.shift()
      return handleFillWithLiquid(npc, objects[0][0], objects[1][0])
    }
  }),

  new Cmd('PutIn', {
    rules: [cmdRules.canManipulate, cmdRules.isHeld],
    objects: [
      { scope: parser.isHeld, multiple: true },
      { scope: parser.isPresent, attName: 'container' }
    ],
    script: function (objects) {
      return handlePutInContainer(game.player, objects)
    }
  }),

  new Cmd('NpcPutIn1', {
    rules: [cmdRules.canManipulate, cmdRules.isHeld],
    cmdCategory: 'PutIn',
    objects: [
      { scope: parser.isHere, attName: 'npc' },
      { scope: parser.isHeld, multiple: true },
      { scope: parser.isPresent, attName: 'container' }
    ],
    script: function (objects) {
      const npc = objects[0][0]
      if (!npc.npc) {
        io.failedio.msg(lang.not_npc(npc))
        return util.FAILED
      }
      objects.shift()
      return handlePutInContainer(npc, objects)
    }
  }),
  new Cmd('NpcPutIn2', {
    rules: [cmdRules.canManipulate, cmdRules.isHeld],
    cmdCategory: 'PutIn',
    objects: [
      { scope: parser.isHere, attName: 'npc' },
      { scope: parser.isHeld, multiple: true },
      { scope: parser.isPresent, attName: 'container' }
    ],
    script: function (objects) {
      const npc = objects[0][0]
      if (!npc.npc) {
        io.failedio.msg(lang.not_npc(npc))
        return util.FAILED
      }
      objects.shift()
      return handlePutInContainer(npc, objects)
    }
  }),

  new Cmd('TakeOut', {
    rules: [cmdRules.canManipulate, cmdRules.isHere],
    objects: [
      { scope: parser.isContained, multiple: true },
      { scope: parser.isPresent, attName: 'container' }
    ],
    script: function (objects) {
      return handleTakeFromContainer(game.player, objects)
    }
  }),

  new Cmd('NpcTakeOut1', {
    rules: [cmdRules.canManipulate, cmdRules.isHeld],
    cmdCategory: 'TakeOut',
    objects: [
      { scope: parser.isHere, attName: 'npc' },
      { scope: parser.isContained, multiple: true },
      { scope: parser.isPresent, attName: 'container' }
    ],
    script: function (objects) {
      const npc = objects[0][0]
      if (!npc.npc) {
        io.failedio.msg(lang.not_npc(npc))
        return util.FAILED
      }
      objects.shift()
      return handleTakeFromContainer(npc, objects)
    }
  }),
  new Cmd('NpcTakeOut2', {
    rules: [cmdRules.canManipulate, cmdRules.isHeld],
    cmdCategory: 'TakeOut',
    objects: [
      { scope: parser.isHere, attName: 'npc' },
      { scope: parser.isContained, multiple: true },
      { scope: parser.isPresent, attName: 'container' }
    ],
    script: function (objects) {
      const npc = objects[0][0]
      if (!npc.npc) {
        io.failedio.msg(lang.not_npc(npc))
        return util.FAILED
      }
      objects.shift()
      return handleTakeFromContainer(npc, objects)
    }
  }),

  new Cmd('GiveTo', {
    rules: [cmdRules.canManipulate, cmdRules.isHeld],
    objects: [
      { scope: parser.isHeld, multiple: true },
      { scope: parser.isPresent, attName: 'npc' }
    ],
    script: function (objects) {
      return handleGiveToNpc(game.player, objects)
    }
  }),
  new Cmd('NpcGiveTo1', {
    rules: [cmdRules.canManipulate, cmdRules.isHeld],
    cmdCategory: 'Give',
    objects: [
      { scope: parser.isHere, attName: 'npc' },
      { scope: parser.isHeld, multiple: true },
      { scope: parser.isPresentOrMe, attName: 'npc' }
    ],
    script: function (objects) {
      const npc = objects[0][0]
      if (!npc.npc) {
        io.failedio.msg(lang.not_npc(npc))
        return util.FAILED
      }
      objects.shift()
      return handleGiveToNpc(npc, objects)
    }
  }),
  new Cmd('NpcGiveTo2', {
    rules: [cmdRules.canManipulate, cmdRules.isHeld],
    cmdCategory: 'Give',
    objects: [
      { scope: parser.isHere, attName: 'npc' },
      { scope: parser.isHeld, multiple: true },
      { scope: parser.isPresent, attName: 'npc' }
    ],
    script: function (objects) {
      const npc = objects[0][0]
      if (!npc.npc) {
        io.failedio.msg(lang.not_npc(npc))
        return util.FAILED
      }
      objects.shift()
      return handleGiveToNpc(npc, objects)
    }
  }),

  new Cmd('Pushworld.Exit', {
    rules: [cmdRules.canManipulate, cmdRules.isHereNotHeld],
    cmdCategory: 'Push',
    script: function (objects) {
      return handlePushExit(game.player, objects)
    },
    objects: [
      { text: true },
      { scope: parser.isHere, attName: 'shiftable' },
      { text: true }
    ]
  }),
  new Cmd('NpcPushworld.Exit1', {
    rules: [cmdRules.canManipulate, cmdRules.isHereNotHeld],
    cmdCategory: 'Push',
    script: function (objects) {
      const npc = objects[0][0]
      if (!npc.npc) {
        io.failedio.msg(lang.not_npc(npc))
        return util.FAILED
      }
      objects.shift()
      return handlePushExit(npc, objects)
    },
    objects: [
      { scope: parser.isHere, attName: 'npc' },
      { text: true },
      { scope: parser.isHere, attName: 'shiftable' },
      { text: true }
    ]
  }),
  new Cmd('NpcPushworld.Exit2', {
    rules: [cmdRules.canManipulate, cmdRules.isHereNotHeld],
    cmdCategory: 'Push',
    script: function (objects) {
      const npc = objects[0][0]
      if (!npc.npc) {
        io.failedio.msg(lang.not_npc(npc))
        return util.FAILED
      }
      objects.shift()
      return handlePushExit(npc, objects)
    },
    objects: [
      { scope: parser.isHere, attName: 'npc' },
      { text: true },
      { scope: parser.isHere, attName: 'shiftable' },
      { text: true }
    ]
  }),

  new Cmd('AskAbout', {
    rules: [cmdRules.canTalkTo],
    script: function (arr) {
      if (!game.player.canTalk()) return false
      if (!arr[0][0].askabout) return io.failedio.msg(lang.cannot_ask_about(game.player, arr[0][0], arr[1]))

      return arr[0][0].askabout(arr[2], arr[1]) ? util.SUCCESS : util.FAILED
    },
    objects: [
      { scope: parser.isNpcAndHere },
      { text: true },
      { text: true }
    ]
  }),
  new Cmd('TellAbout', {
    rules: [cmdRules.canTalkTo],
    script: function (arr) {
      if (!game.player.canTalk()) return false
      if (!arr[0][0].tellabout) return io.failedio.msg(lang.cannot_tell_about(game.player, arr[0][0], arr[1]))

      return arr[0][0].tellabout(arr[2], arr[1]) ? util.SUCCESS : util.FAILED
    },
    objects: [
      { scope: parser.isNpcAndHere },
      { text: true },
      { text: true }
    ]
  })

]

// DEBUG commands

if (settings.debug) {
  commands.push(new Cmd('DebugWalkThrough', {
    objects: [
      { text: true }
    ],
    script: function (objects) {
      const wt = walkthroughs[objects[0]] // -fixme:  this
      if (wt === undefined) {
        io.debugmsg('No walkthought found called ' + objects[0])
        return
      }
      for (const el of wt) {
        io.debugmsg(el)
        parser.parse(el)
      }
    }
  }))

  commands.push(new Cmd('DebugInspect', {
    script: function (arr) {
      const item = arr[0][0]
      io.debugmsg('See the console for details on the object ' + item.name + ' (press F12 to util.display the console)')
      console.log(item)
      return util.util.SUCCESS_NO_TURNSCRIPTS
    },
    objects: [
      { scope: parser.isInWorld }
    ]
  }))

  commands.push(new Cmd('DebugInspectByName', {
    script: function (arr) {
      const item_name = arr[0] // -fixme: camelCase
      if (!w[item_name]) {
        io.debugmsg('No object called ' + item_name)
        return util.FAILED
      }

      io.debugmsg('See the console for details on the object ' + item_name + ' (press F12 to util.display the console)')
      console.log(w[item_name])
      return util.util.SUCCESS_NO_TURNSCRIPTS
    },
    objects: [
      { text: true }
    ]
  }))

  commands.push(new Cmd('DebugTest', {
    script: function () {
      util.test.runTests()
      return util.util.SUCCESS_NO_TURNSCRIPTS
    }
  }))

  commands.push(new Cmd('DebugInspectCommand', {
    script: function (arr) {
      io.debugmsg('Looking for ' + arr[0])
      for (const cmd of commands) {
        if (cmd.name.toLowerCase() === arr[0] || (cmd.cmdCategory && cmd.cmdCategory.toLowerCase() === arr[0])) {
          io.debugmsg('Name: ' + cmd.name)
          for (const key in cmd) {
            if (cmd.hasOwnProperty(key)) { // -fixme: thefuck is this?
              io.debugmsg('--' + key + ': ' + cmd[key])
            }
          }
        }
      }
      return util.util.SUCCESS_NO_TURNSCRIPTS
    },
    objects: [
      { text: true }
    ]
  }))

  commands.push(new Cmd('DebugListCommands', {
    script: function (arr) {
      let count = 0
      for (const cmd of commands) {
        if (!cmd.name.match(/\d$/)) {
          let s = cmd.name + ' (' + cmd.regex

          let altCmd
          let n = 2
          do {
            altCmd = commands.find(el => el.name === cmd.name + n)
            if (altCmd) s += ' or ' + altCmd.regex
            n++
          } while (altCmd)
          s += ')'

          const npcCmd = commands.find(el => el.name === 'Npc' + cmd.name + '2')
          if (npcCmd) s += ' - NPC too'
          io.debugmsg(s)
          count++
        }
      }
      io.debugmsg('... Found ' + count + ' commands.')
      return util.util.SUCCESS_NO_TURNSCRIPTS
    },
    objects: [
    ]
  }))

  commands.push(new Cmd('DebugListCommands2', {
    script: function (arr) {
      let count = 0
      for (const cmd of commands) {
        const s = cmd.name + ' (' + cmd.regex + ')'
        io.debugmsg(s)
        count++
      }
      io.debugmsg('... Found ' + count + ' commands.')
      return util.util.SUCCESS_NO_TURNSCRIPTS
    },
    objects: [
    ]
  }))

  commands.push(new Cmd('DebugParserToggle', {
    script: function (arr) { // -fixme: unused arr
      if (parser.debug) {
        parser.debug = false
        io.debugmsg('Parser debugging messages are off.')
      } else {
        parser.debug = true
        io.debugmsg('Parser debugging messages are on.')
      }
      return util.util.SUCCESS_NO_TURNSCRIPTS
    },
    objects: [
    ]
  }))
}

// Functions used by commands
// (but not in the commands array)

// Cannot handle multiple vessels
function handleFillWithLiquid (char, vessel, liquid) {
  if (!vessel.vessel) return io.failedio.msg(lang.not_vessel(char, vessel))
  if (vessel.closed) return io.failedio.msg(lang.container_closed(char, vessel))
  if (!char.canManipulate(vessel, 'fill')) return util.FAILED
  if (!char.getAgreement('Fill', vessel)) return util.FAILED
  if (!vessel.isAtLoc(char.name)) return io.failedio.msg(lang.not_carrying(char, vessel))

  return vessel.fill(false, char, liquid) ? util.SUCCESS : util.FAILED
}

function handlePutInContainer (char, objects) {
  let success = false
  const container = objects[1][0]
  const multiple = objects[0].length > 1 || parser.currentCommand.all
  if (!container.container) {
    io.failedio.msg(lang.not_container(char, container))
    return util.FAILED
  }
  if (container.closed) {
    io.failedio.msg(lang.container_closed(char, container))
    return util.FAILED
  }
  if (!char.canManipulate(objects[0], 'put')) {
    return util.FAILED
  }
  for (const obj of objects[0]) {
    let flag = true
    if (!char.getAgreement('Put/in', obj)) {
      // The getAgreement should give the response
      continue
    }
    if (!container.util.testForRecursion(char, obj)) {
      flag = false
    }
    if (container.util.testRestrictions) {
      flag = container.util.testRestrictions(obj, char)
    }
    if (flag) {
      if (!obj.isAtLoc(char.name)) {
        io.failedio.msg(util.prefix(obj, multiple) + lang.not_carrying(char, obj))
      } else {
        obj.moveToFrom(container.name, char.name)
        io.msg(util.prefix(obj, multiple) + lang.done_io.msg)
        success = true
      }
    }
  }
  if (success && container.putInResponse) container.putInResponse()
  if (success === util.SUCCESS) char.pause()
  return success ? util.SUCCESS : util.FAILED
}

function handleTakeFromContainer (char, objects) {
  let success = false
  const container = objects[1][0]
  const multiple = objects[0].length > 1 || parser.currentCommand.all
  if (!container.container) {
    io.failedio.msg(lang.not_container(char, container))
    return util.FAILED
  }
  if (container.closed) {
    io.failedio.msg(lang.container_closed(char, container))
    return util.FAILED
  }
  if (!char.canManipulate(objects[0], 'get')) {
    return util.FAILED
  }
  for (const obj of objects[0]) {
    const flag = true
    if (!char.getAgreement('Take', obj)) {
      // The getAgreement should give the response
      continue
    }
    if (flag) {
      if (!obj.isAtLoc(container.name)) {
        io.failedio.msg(util.prefix(obj, multiple) + lang.not_inside(container, obj))
      } else {
        obj.moveToFrom(char.name, container.name)
        io.msg(util.prefix(obj, multiple) + lang.done_io.msg)
        success = true
      }
    }
  }
  // This works for put in as this is the only way to do it, but not here
  // as TAKE can remove itsms from a container too.
  // if (success && container.putInResponse) container.putInResponse();
  if (success === util.SUCCESS) char.pause()
  return success ? util.SUCCESS : util.FAILED
}

function handleGiveToNpc (char, objects) {
  let success = false
  const npc = objects[1][0]
  const multiple = objects[0].length > 1 || parser.currentCommand.all
  if (!npc.npc && npc !== game.player) {
    io.failedio.msg(lang.not_npc_for_give(char, npc))
    return util.FAILED
  }
  for (const obj of objects[0]) {
    let flag = true
    if (!char.getAgreement('Give', obj)) {
      // The getAgreement should give the response
    }
    if (npc.util.testRestrictions) {
      flag = npc.util.testRestrictions(obj)
    }
    if (!npc.canManipulate(obj, 'give')) {
      return util.FAILED
    }
    if (flag) {
      if (!obj.isAtLoc(char.name)) {
        io.failedio.msg(util.prefix(obj, multiple) + lang.not_carrying(char, obj))
      } else {
        if (npc.giveReaction) {
          npc.giveReaction(obj, multiple, char)
        } else {
          io.msg(util.prefix(obj, multiple) + lang.done_io.msg)
          obj.moveToFrom(npc.name, char.name)
        }
        success = true
      }
    }
  }
  if (success === util.SUCCESS) char.pause()
  return success ? util.SUCCESS : util.FAILED
}

function handleStandUp (objects) {
  const npc = objects.length === 0 ? game.player : objects[0][0]
  if (!npc.npc) {
    io.failedio.msg(lang.not_npc(npc))
    return util.FAILED
  }
  if (!npc.posture) {
    io.failedio.msg(lang.already(npc))
    return util.FAILED
  }
  if (npc.getAgreementPosture && !npc.getAgreementPosture('stand')) {
    // The getAgreement should give the response
    return util.FAILED
  } else if (!npc.getAgreementPosture && npc.getAgreement && !npc.getAgreement('Posture', 'stand')) {
    return util.FAILED
  }
  if (!npc.canPosture()) {
    return util.FAILED
  }
  if (npc.posture) {
    io.msg(lang.stop_posture(npc))
    npc.pause()
    return util.SUCCESS
  }
}

// we know the char can manipulate, we know the obj is here and not held
function handlePushExit (char, objects) {
  const verb = util.getDir(objects[0])
  const obj = objects[1][0]
  const dir = util.getDir(objects[2])
  const room = w[char.loc]

  if (!obj.shiftable && obj.takeable) {
    io.msg(lang.TAKE_not_push(char, obj))
    return util.FAILED
  }
  if (!obj.shiftable) {
    io.msg(lang.cannot_push(char, obj))
    return util.FAILED
  }
  if (!room[dir] || room[dir].isHidden()) {
    io.msg(lang.not_that_way(char, dir))
    return util.FAILED
  }
  if (room[dir].isLocked()) {
    io.msg(lang.locked_exit(char, room[dir]))
    return util.FAILED
  }
  if (typeof room[dir].noShiftingMsg === 'function') {
    io.msg(room[dir].noShiftingMsg(char, 'item')) // -fixme: "item" is undefined
    return util.FAILED
  }
  if (typeof room[dir].noShiftingMsg === 'string') {
    io.msg(room[dir].noShiftingMsg)
    return util.FAILED
  }

  if (typeof obj.shift === 'function') {
    const res = obj.shift(char, dir, verb)
    return res ? util.SUCCESS : util.FAILED
  }

  // by default, objects cannot be pushed up
  if (dir === 'up') {
    io.msg(lang.cannot_push_up(char, obj))
    return util.FAILED
  }

  // not using moveToFrom; if there are
  const dest = room[dir].name
  obj.moveToFrom(dest)
  char.loc = dest
  io.msg(lang.push_exit_successful(char, obj, dir, w[dest]))
  return util.SUCCESS
}
export {
  handlePushExit
}
