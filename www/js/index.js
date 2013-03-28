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

var timerInterval;

var data = {
  deviceId: "0H5N4P",
  gameId: -1,
  panels: [],
  panelIndex: 0,
  gender: null,
  timings: { 1: 20000, 2: 2, 3: 15 }, // seconds per round
  roundCountdown: null,
  currentRound: 0,
  roundLoaded: false,
  rounds: [],
  totalRounds: 3,
  appHeight: $(window).height(),
  betweenPanelLength: 3000,
  sidebarOpacityMultiplier: 2
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

var ItemResult = function(like) {
  this.imageId = '';
  this.like = like;
  this.timeToDecide = 0;
};

var love = $('#love'),
    nah = $('#nah'),
    img, imgMid, pastHalf, opacity;

var app = {

  // Application Constructor
  initialize: function() {
    this.bindEvents();
    this.setupButtons();
    this.setupPanels();
    this.setupGender();
    this.setupCategories();
    this.setupStartButton();
  },

  setupPanels: function() {
    $('.panel').each(function() {
      data.panels.push($(this));
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
    $('#btn-start').one('tap', function() {
      var el = $(this);
      el.html('Loading...');
      el.addClass('btn-next');

      app.incrementRound();
      app.loadRound();
      app.startNextRound();
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
      data.gender = $(this).attr('id');
    });
  },

  bindItemImageEvents: function() {
    var lastPos = [0, 0],
        curPos = [0, 0],
        wait = false,
        sampleRate = 10,
        moverTimeout;

    $('.item-image')
      .draggable({
        start: function() {
          var imgWidth = $(this).width();

          data.screenWidth = $(window).width();
          data.screenHalf = data.screenWidth / 2;
          data.imgHalf = imgWidth / 2;

          clearTimeout(moverTimeout);
        },

        drag: function(e) {
          img = this[0];
          app.calcSidebarOpacity(img);

          if (!lastPos) {
            lastPos = offsets(img);
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
              curTop = img.offsetTop,
              curLeft = img.offsetLeft;

          moverTimeout = setTimeout(mover, sampleRate);

          function mover() {
            curLeft += direction * Math.max( Math.abs(difference), 10); // min speed

            if (curLeft > data.screenWidth) {
              zImg.remove();
              app.recordItemResult(true);
            }
            else if (curLeft < 0) {
              zImg.remove();
              app.recordItemResult(false);
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

  recordItemResult: function(like) {
    var round = app.getCurrentRound();
    if (round.roundComplete) return false;

    round.countCompletedItems++;
    app.updateSidebar(round, like);

    // Push result
    round.itemResults.push(new ItemResult(like));

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
      round.countCompletedItems++;
      round.roundComplete = true;
      console.log(app.getCurrentRound());
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
    $('#' + id).css('visibility', val ? 'visible' : 'hidden');
  },

  roundTimedOut: function() {
    round.roundComplete = true;
    app.completeRound();
  },

  completeRound: function() {
    console.log('complete round');
    app.incrementRound();
    app.resetRoundPanel();
    app.loadRound();
    app.showBetweenRoundPanel();
  },

  showBetweenRoundPanel: function() {
    $('#end-of-round').addClass('shown');

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
          alert('timed out!');
        }
      }, 2000);
    }, data.betweenPanelLength - 200);
  },

  startNextRound: function() {
    app.startTimer();
  },

  resetRoundPanel: function() {
    var round = app.getCurrentRound();
    app.showSidebar('love', false);
    app.showSidebar('nah', false);
    $('#position').css('width', '0%');
    $('#round-title').html('Round ' + round.roundNumber);
    $('.count').html('0');
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

    app.bindItemImageEvents();
  },

  startTimer: function() {
    data.roundCountdown = data.timings[data.currentRound] * 1000;
    app.updateTimer(data.roundCountdown);
    timerInterval = setTimeout(app.incrementTimer, 10);
  },

  incrementTimer: function() {
    data.roundCountdown -= 10;

    if (data.roundCountdown <= 0) {
      app.roundTimedOut();
    } else {
      app.updateTimer(data.roundCountdown);
      setTimeout(app.incrementTimer, 10);
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
      .on('touchmove', function(e) { e.preventDefault(); });
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