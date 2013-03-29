/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

var timerInterval, moverTimeout;

var data = {
  deviceId: "0H5N4P",
  gameId: -1,
  panels: [],
  panelIndex: 0,
  gender: null,
  timings: { 1: 20, 2: 15, 3: 12 }, // seconds per round
  roundCountdown: null,
  currentRound: 0,
  roundLoaded: false,
  rounds: [],
  totalRounds: 3,
  allRoundsCompleted: false,
  appHeight: $(window).height(),
  betweenPanelLength: 4000,
  sidebarOpacityMultiplier: 2,
  itemTimeStarted: -1, // To track how long a user takes to decide on an item
  reCenterImage: false,
  noScroll: true
};

var Round = function(number) {
  var self = this;
  self.roundNumber = number;
  self.items = [];
  self.itemResults = [];
  self.countItems = 0;
  self.countCompletedItems = 0;
  self.countLiked = 0;
  self.countDisliked = 0;
  self.roundComplete = false;
};

var ItemResult = function(like, timeToDecide) {
  var self = this;
  self.itemId = '';
  self.like = like;
  self.timeToDecide = timeToDecide;
};

var love = $('#love'),
    nah = $('#nah'),
    img, imgMid, pastHalf, opacity;

var app = {

  // Application Constructor
  initialize: function() {
    app.bindEvents();
    app.setupButtons();
    app.setupPanels();
    app.setupGender();
    app.setupCategories();
    app.setupStartButton();
    app.setupDoneButton();
  },

  resetGame: function() {
    clearTimeout(timerInterval);
    clearTimeout(moverTimeout);
    data.currentRound = 0;
    data.rounds = [];
    data.roundLoaded = false;
    data.panelIndex = 0;
    data.noScroll = true;
    $('.panel').removeClass('off on');
    $('#panel-home').addClass('on');
    $('.toggles a').removeClass('active');
    $('#btn-start').html('Start!');
    $('#item-image').remove();
    app.resetRoundPanel();
  },

  setupPanels: function() {
    data.screenWidth = $(window).width();
    data.screenHalf = data.screenWidth / 2;

    $('.panel').each(function() {
      data.panels.push($(this));

      var center = $('.center', this);
      if (center.length) {
        center.css('margin-top', '-' + center.height() / 2 + 'px');
      }
    });
  },

  nextPanel: function() {
    var cur = $('.panel.on'),
        next = cur.next();

    cur.removeClass('on').addClass('off');
    next.removeClass('next').addClass('on');
    next.next().addClass('next');
  },

  setupButtons: function() {
    $('body').on('tap', '.btn-next', function(e) {
      if ($(this).is('.disabled')) return;
      e.preventDefault();
      app.nextPanel();
    });
  },

  setupCategories: function() {
    var numSelected = 0;

    // Toggles! Limit to 3
    $('.toggles').on('tap', 'a', function() {
      var el = $(this),
          selected = el.is('.active');

      if (selected) {
        numSelected--;
        el.removeClass('active');
      }
      else {
        if (numSelected < 3) {
          numSelected++;
          el.addClass('active');
        }
      }

      $('#btn-start').toggleClass('disabled', !numSelected);
    });
  },

  setupStartButton: function() {
    $('#btn-start').on('tap', function() {
      var el = $(this);
      el.html('Loading...');
      el.addClass('btn-next');

      app.incrementRound();
      app.loadRound();
      app.startNextRound();
    });
  },

  setupDoneButton: function() {
    $('#im-done, #final-back').on('tap', function() {
      app.resetGame();
    });
  },

  incrementRound: function() {
    data.currentRound++;
    data.rounds[data.currentRound] = new Round(data.currentRound);
    data.roundLoaded = false;
  },

  getCurrentRound: function() {
    return data.rounds[data.currentRound];
  },

  setupGender: function() {
    $('#male,#female').on('tap', function() {
      data.gender = $(this).attr('value');
    });
  },

  bindItemImageEvents: function() {
    var lastPos = [0, 0],
        curPos = [0, 0],
        wait = false,
        sampleRate = 30;

    // Thresholds for minimum move to count
    var adjust = 10;
    data.leftThreshold = data.screenHalf - data.imgHalf - adjust;
    data.rightThreshold = data.screenHalf - data.imgHalf + adjust;

    $('.item-image')
      .draggable({
        start: function() {
          clearTimeout(moverTimeout);
        },

        drag: function(e) {
          img = this[0];
          app.calcSidebarOpacity(img);

          if (!lastPos) {
            lastPos = img.offsetLeft;
          }
          else {
            if (!wait) {
              wait = true;
              setTimeout(function() {
                wait = false;

                // Store values
                lastPos = curPos;
                curPos = img.offsetLeft;
              }, sampleRate);
            }
          }
        },

        stop: function() {
          var img = this[0],
              zImg = $(this),
              difference = curPos - lastPos,
              direction = difference > 0 ? 1 : -1,
              curLeft = img.offsetLeft;

          // far enough right
          if (curLeft > data.rightThreshold) {
            direction = 1;
          }
          // far enough left
          else if (curLeft < data.leftThreshold) {
            direction = -1;
          }
          // not far enough
          else {
            data.reCenterImage = true;
            return false;
          }

          step = direction * Math.max( Math.abs(difference), 35);
          moverTimeout = setTimeout(mover, sampleRate);

          function mover() {
            var itemTimeEnded;

            curLeft += step;

            if (curLeft > data.screenWidth) {
              zImg.remove();
              itemTimeEnded = (new Date().getTime()) - data.itemTimeStarted;
              app.recordItemResult(true, itemTimeEnded);
              data.itemTimeStarted = new Date().getTime();
            }
            else if (curLeft < 0) {
              zImg.remove();
              itemTimeEnded = (new Date().getTime()) - data.itemTimeStarted;
              app.recordItemResult(false, itemTimeEnded);
              data.itemTimeStarted = new Date().getTime();
            }
            else {
              app.calcSidebarOpacity(img);
              zImg.css({ left: curLeft });
              moverTimeout = setTimeout(mover, sampleRate);
            }
          }
        }
      })
      .on('draggable:start', function() {
        $(this).addClass('is-dragging');
      })
      .on('draggable:end', function() {
        $(this).removeClass('is-dragging centered');

        if (data.reCenterImage) {
          var img = $(this);
          setTimeout(function() {
            img.css('left', '').removeAttr('style').addClass('centered');
          })
          data.reCenterImage = false;
        }
      });
  },

  calcSidebarOpacity: function(img) {
    imgMid = img.offsetLeft + data.imgHalf,
    pastHalf = imgMid > data.screenHalf;

    if (pastHalf) {
      opacity = 1 - ((data.screenWidth - imgMid) / data.screenHalf);
      love.css('opacity', opacity * data.sidebarOpacityMultiplier);
    } else {
      opacity = (data.screenHalf - imgMid) / data.screenHalf;
      nah.css('opacity', opacity * data.sidebarOpacityMultiplier);
    }
  },

  recordItemResult: function(like, timeToDecide) {
    var round = app.getCurrentRound();
    if (round.roundComplete) return false;

    round.countCompletedItems++;
    app.updateSidebar(round, like);

    // Push result
    round.itemResults.push(new ItemResult(like, timeToDecide));

    // If we have more images
    if (round.countCompletedItems != round.countItems) {
      // Update percent done progress
      if (round.countItems > 0) {
        var percentDone = Math.round(round.countCompletedItems * 100 / round.countItems);
        $('#position').css('width', percentDone + '%');
      }
    }
    else {
      // No more images
      $('#position').css('width', '100%');
      round.roundComplete = true;
      app.completeRound();
    }
  },

  updateSidebar: function(round, like) {
    if (like) {
      $('#love .count').html(++round.countLiked);
      app.showSidebar('love', true);
      app.showSidebar('nah', false);
    } else {
      $('#nah .count').html(++round.countDisliked);
      app.showSidebar('love', false);
      app.showSidebar('nah', true);
    }
  },

  showSidebar: function(id, val) {
    var sidebar = $('#' + id);

    // Liked
    if (val) {
      sidebar.addClass('liked');
      setTimeout(function() {
        sidebar.removeClass('liked');
      }, 80);
    }
    // Nah'd
    else {
      sidebar.css('opacity', '0');
    }
  },

  roundTimedOut: function() {
    round.roundComplete = true;
    app.completeRound();
  },

  completeRound: function() {
    clearTimeout(moverTimeout);
    app.updateRoundPanel();

    // 1 second delay before showing stats
    setTimeout(function() {
      if (data.currentRound < data.totalRounds) {
        app.incrementRound();
        app.resetRoundPanel();
        app.loadRound();
        app.showBetweenRoundPanel();
      }
      else {
        // We need to set the round loaded variable
        // to false since we've already gone through
        // our last round.
        data.roundLoaded = false;
        app.showFinalGameScreen();
      }
    }, 500);
  },

  showFinalGameScreen: function() {
    data.noScroll = false;
    $('#final-screen').addClass('on');
  },

  updateRoundPanel: function() {
    $('#round-stats h4 .current-round').html(data.currentRound);
    $('#round-stats .stat-rose .stat-value').text(data.rounds[data.currentRound].countCompletedItems + '/' + 
                                                  data.rounds[data.currentRound].countItems);
    $('#round-stats .stat-pink .stat-value').text(data.rounds[data.currentRound].countLiked + '');
    $('#round-stats .stat-teal .stat-value').text(data.rounds[data.currentRound].countDisliked + '');
    $('#round-stats .stat-blue .stat-value').text(app.calculateAverageTimeToDecide(data.currentRound) + ' sec');
  },

  calculateAverageTimeToDecide: function(currentRound) {
    var rval = '--';

    var totalTime = 0;
    itemResults = data.rounds[currentRound].itemResults;

    if (itemResults.length > 0) {
      for (var i = 0; i < itemResults.length; i++) {
        totalTime += itemResults[i].timeToDecide;
      }
      rval = totalTime/(1000 * itemResults.length);
      rval = (rval.toFixed(2) * 100) / 100;  
    }
    return rval;
  },

  showBetweenRoundPanel: function() {
    $('#end-of-round').addClass('shown');
    app.chooseRandomSaying();
    app.updateRoundCounter();

    var checkRoundLoaded;
    setTimeout(function() {
      checkRoundLoaded = setInterval(function() {
        if (data.roundLoaded) {
          clearInterval(checkRoundLoaded);
          app.startNextRound();
          $('#end-of-round').removeClass('shown');
        }
      }, 200);

      // Safety if we don't ever get a response
      setTimeout(function() {
        if (!data.roundLoaded) {
          // Timed out :(
          clearInterval(checkRoundLoaded);
        }
      }, 2000);
    }, data.betweenPanelLength - 200);
  },

  chooseRandomSaying: function() {
    var sayings = $('#sayings-from-the-soul'),
        sayingsWhileYouWait = [
      'Proxying getsticulation request...', 
      'Forming opinions of grandeur...',
      'Fueling baboons for eradication...',
      'Proxying getsticulation request...', 
      'Forming opinions of grandeur...',
      'Fueling baboons for eradication...'
    ];

    var sayingInterval = setInterval(function() {
      var randomIndex = Math.floor(Math.random() * (sayingsWhileYouWait.length)),
          randomSaying = sayingsWhileYouWait[randomIndex];

      sayings.html(randomSaying);
    }, 700);

    setTimeout(function() {
      clearInterval(sayingInterval);
    }, data.betweenPanelLength)
  },

  startNextRound: function() {
    data.itemTimeStarted = new Date().getTime();
    app.startTimer();
  },

  resetRoundPanel: function() {
    var round = app.getCurrentRound();
    app.showSidebar('love', false);
    app.showSidebar('nah', false);
    $('#position').css('width', '0%');
    $('.count').html('0');

    var roundNum = round ? round.roundNumber : 1;
    $('#round-title').html('Round ' + roundNum);
  },

  loadRound: function(callback) {
    var roundNumber = app.getCurrentRound().roundNumber;
    // Temp
    var items = [
      {"url":"http://www.zappos.com/images/z/1/9/5/8/8/3/1958832-t-THUMBNAIL.jpg","id":"1958832"},
      {"url":"http://www.zappos.com/images/z/2/0/0/8/2/9/2008296-t-THUMBNAIL.jpg","id":"2008296"},
      {"url":"http://www.zappos.com/images/z/2/0/0/8/2/9/2008295-t-THUMBNAIL.jpg","id":"2008295"},
      {"url":"http://www.zappos.com/images/z/1/9/0/2/0/5/1902054-t-THUMBNAIL.jpg","id":"1902054"},
      {"url":"http://www.zappos.com/images/z/1/9/0/2/0/5/1902055-t-THUMBNAIL.jpg","id":"1902055"}
    ];

    data.roundLoaded = true;

    app.loadImages(items);
    $('#panel-game').addClass('loaded');

    if (callback) callback.call();
  },

  loadImages: function(items) {
    var i, len, round = app.getCurrentRound();

    round.countItems = items.length;
    round.items = items;

    len = round.countItems;
    for (i = 0; i < len; i++) {
      $('<img class="item-image centered" src="'+round.items[i].url+'">').appendTo('#game-images');
    }

    data.imgWidth = $('.item-image').width();
    data.imgHalf = data.imgWidth / 2;

    app.bindItemImageEvents();
  },

  startTimer: function() {
    data.roundCountdown = data.timings[data.currentRound] * 1000;
    app.updateTimer(data.roundCountdown);
    timerInterval = setTimeout(app.incrementTimer, 10);
  },

  incrementTimer: function() {
    data.roundCountdown -= 10;

    if (data.roundCountdown <= 10) {
      $('#timer').html('00:000');
      app.roundTimedOut();
    } else {
      app.updateTimer(data.roundCountdown);
      timerInterval = setTimeout(app.incrementTimer, 10);
    }
  },

  updateTimer: function(total) {
    var s = Math.floor(total / 1000) + "",
        ms = (total % 1000) + "";

    while (s.length < 2) s = "0" + s;
    while (ms.length < 3) ms = "0" + ms;

    $('#timer').html(s + ':' + ms);
  },

  updateRoundCounter: function() {
    var prev = $('#round-' + (data.currentRound - 1)),
        cur = $('#round-' + data.currentRound);

    prev.removeClass('current');
    cur.addClass('current').after($('#bar').remove());
  },

  // Bind Event Listeners
  // Bind any events that are required on startup. Common events are:
  // 'load', 'deviceready', 'offline', and 'online'.
  bindEvents: function() {
    $(document)
      .on('deviceready', this.onDeviceReady)
      .on('touchmove', function(e) {
        if (data.noScroll) e.preventDefault();
      });
  },

  // deviceready Event Handler
  //
  // The scope of 'this' is the event. In order to call the 'receivedEvent'
  // function, we must explicity call 'app.receivedEvent(...);'
  onDeviceReady: function() {
    // ready
  }

};


// $('body').swipeRight(function() {$('#intro').html('<li>right</li>');});
// $('body').swipeLeft(function() {$('#intro').html('<li>left</li>');});
// $('body').swipeUp(function() {$('#intro').html('<li>up</li>');});
// $('body').tap(function() {$('#intro').html('<li>tap</li>');});
// $('body').doubleTap(function() {$('#intro').html('<li>double tap</li>');});
// $('body').longTap(function() {$('#intro').html('long tap');});


// $.ajax({
//   dataType: 'JSONP',
//   type: 'GET',
//   url: 'http://ohsnap.elasticbeanstalk.com/recommendation/custId/1/resultSize/10',
//   success: function(data) {
//     console.log(data);
//   }
// });
// $.ajax({
//   type: 'POST',
//   url: 'http://ohsnap.elasticbeanstalk.com/start',
//   data: {
//     gender: data.gender,
//     categories: $('.toggles .active').pluck('id')
//   },
//   success: function(data) {
//   }
// });