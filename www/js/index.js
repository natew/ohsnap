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

var timerInterval, moverTimeout, countdownInterval, statsTimeout, checkRoundLoaded;

var initialized = false;

var data = {
  deviceId: "0H5N4P",
  gameId: -1,
  panels: [],
  panelIndex: 0,
  gender: null,
  timings: { 1: 6, 2: 6, 3: 6 }, // seconds per round
  roundCountdown: null,
  currentRound: 0,
  roundLoaded: false,
  rounds: [],
  totalRounds: 3,
  allRoundsCompleted: false,
  appHeight: $(window).height(),
  betweenPanelLength: 5000,
  sidebarOpacityMultiplier: 2,
  itemTimeStarted: -1, // To track how long a user takes to decide on an item
  reCenterImage: false,
  noScroll: true,
  cdStart: 2,
  itemCountToRequest: {1: 9, 2: 8, 3:6}, // How many items to request per round
  cdTimer: $('#countdown'),
  cdPanel: $('#panel-countdown'),
  numSelected: 0
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

var ItemResult = function(like, timeToDecide, styleId, productId) {
  var self = this;
  self.styleId = styleId;
  self.productId = productId;
  self.like = like;
  self.timeToDecide = timeToDecide;
};

var love = $('#love'),
    nah = $('#nah'),
    img, imgMid, pastHalf, opacity;

var app = {

  // Application Constructor
  initialize: function() {
    if (initialized) return;
    app.bindEvents();
    app.setupButtons();
    app.setupPanels();
    app.setupGender();
    app.setupCategories();
    app.setupStartButton();
    app.setupDoneButton();
    initialized = true;
  },

  resetGame: function() {
    clearTimeout(timerInterval);
    clearTimeout(moverTimeout);
    data.numSelected = 0;
    data.currentRound = 0;
    data.rounds = [];
    data.roundLoaded = false;
    data.panelIndex = 0;
    data.noScroll = true;
    $('.badge-wrapper').remove();
    $('.panel').removeClass('off on');
    $('#panel-home').addClass('on');
    $('.toggles a').removeClass('active');
    $('#btn-start').html('Start!').addClass('disabled');
    $('#item-image').remove();
    $('#round-3').removeClass('current');
    $('#round-1').addClass('current').after($('#bar').remove());
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

    $('#how-to-play-button').on('tap', function() {
      data.noScroll = false;
      $('#panel-how-to').addClass('next');
      $('#panel-home').addClass('off');
      $('#panel-how-to').addClass('on');
    });

    $('#user-stats-button').on('tap', function() {
      app.getUserStats(function(responseData) {
        $('#number-games-played').text(responseData.numGamesPlayed);
        $('#total-products-viewed').text(responseData.totalProductsViewed);
        $('#total-products-liked').text(responseData.numLikes);
        $('#total-products-disliked').text(responseData.numDislikes);
        $('#avg-swipe-time-overall').text(app.formatMs(responseData.avgSwipeTimeOverall));
        $('#avg-swipe-time-per-like').text(app.formatMs(responseData.avgSwipeTimePerLike));
        $('#avg-swipe-time-per-dislike').text(app.formatMs(responseData.avgSwipeTimePerDislike));
      });

      data.noScroll = false;
      $('#panel-home').addClass('off');
      $('#panel-user-stats').addClass('on');
    });
  },

  getUserStats: function(callback) {
    $.ajax({
      dataType: 'jsonp',
      type: 'get',
      url: 'http://ohsnap.elasticbeanstalk.com/stats/getAllStats?custId=' + data.deviceId,
      success: function(data) {
        console.log(data);
        if (callback) callback.call(this, data);
      },
      error: function(xhr, status, error) {
        console.log('getUserStats status: ' + status);
      }
    });
  },

  setupCategories: function() {
    // Toggles! Limit to 3
    $('.toggles').on('tap', 'a', function() {
      var el = $(this),
          selected = el.is('.active');

          console.log(data.numSelected)

      if (selected) {
        data.numSelected--;
        el.removeClass('active');
      }
      else {
        if (data.numSelected < 3) {
          data.numSelected++;
          el.addClass('active');
        }
      }

      $('#btn-start').toggleClass('disabled', !data.numSelected);
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
    $('#im-done, .back').on('tap', function() {
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
        sampleRate = 20;

    // Thresholds for minimum move to count
    var adjust = 15;
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

          // First check if we have enough velocity
          if (difference > 10) {
            direction = 1;
          }
          else if (difference < -10) {
            direction = -1;
          }

          // Or if we are past the threshhold
          else if (curLeft > data.rightThreshold) {
            direction = 1;
          }
          else if (curLeft < data.leftThreshold) {
            direction = -1;
          }

          // Else not far enough, re-center it
          else {
            data.reCenterImage = true;
            return false;
          }

          step = direction * Math.max( Math.abs(difference), 50);
          moverTimeout = setTimeout(mover, sampleRate);

          function mover() {
            var itemTimeEnded;

            curLeft += step;

            if (curLeft > data.screenWidth) {
              zImg.remove();
              itemTimeEnded = (new Date().getTime()) - data.itemTimeStarted;
              app.recordItemResult(true, itemTimeEnded, zImg);
              data.itemTimeStarted = new Date().getTime();
            }
            else if (curLeft < 0) {
              zImg.remove();
              itemTimeEnded = (new Date().getTime()) - data.itemTimeStarted;
              app.recordItemResult(false, itemTimeEnded, zImg);
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
      opacity = Math.max( 1 - ((data.screenWidth - imgMid) / data.screenHalf), 0.5);
      love.css('opacity', opacity * data.sidebarOpacityMultiplier);
    } else {
      opacity = Math.max( (data.screenHalf - imgMid) / data.screenHalf, 0.5);
      nah.css('opacity', opacity * data.sidebarOpacityMultiplier);
    }
  },

  recordItemResult: function(like, timeToDecide, image) {
    var round = app.getCurrentRound();
    if (round.roundComplete) return false;

    round.countCompletedItems++;
    app.updateSidebar(round, like);

    var styleId = image[0].getAttribute('styleId');
    var productId = image[0].getAttribute('productId');

    // Push result
    round.itemResults.push(new ItemResult(like, timeToDecide, styleId, productId));

    // If we have more images
    console.log('if we have more', round.countCompletedItems != round.countItems)
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
        sidebar.removeClass('liked').css('opacity', 0.5);
      }, 80);
    }
    // Nah'd
    else {
      sidebar.css('opacity', 0.5);
    }
  },

  roundTimedOut: function() {
    console.log('round timed out');
    round.roundComplete = true;
    app.completeRound();
  },

  completeRound: function() {
    clearTimeout(timerInterval);
    console.log('complete round')
    clearTimeout(moverTimeout);
    app.updateRoundPanel();

    // 1 second delay before showing stats
    clearTimeout(statsTimeout);
    statsTimeout = setTimeout(function() {
      console.log('current round', data.currentRound, 'total rounds', data.totalRounds);
      if (data.currentRound < data.totalRounds) {
        console.log('---run round---');
        app.incrementRound();
        app.resetRoundPanel();
        app.loadRound();
        app.showBetweenRoundPanel();
        app.delayedStartNextRound();
      }
      else {
        // We need to set the round loaded variable
        // to false since we've already gone through
        // our last round.
        data.roundLoaded = false;
        app.showBetweenRoundPanel();

        setTimeout(function() {
          app.showBadgesAndStats();
        }, data.betweenPanelLength);
      }
    }, 400);
  },

  showBadgesAndStats: function() {
    // Send final round request.
    app.sendFinalRoundResults(function(responseData) {
      var stats = responseData['stats'];
      $('#end-of-round').removeClass('shown');
      $('#badges').addClass('on');
      $('#avg-choice .stat-value').html( app.formatMs(stats['avgSwipeTimeOverall']) );
      $('#avg-like .stat-value').html( app.formatMs(stats['avgSwipeTimePerLike']) );
      $('#avg-dislike .stat-value').html( app.formatMs(stats['avgSwipeTimePerDislike']) );

      if (stats['playerTypes']) {
        setTimeout(function() {
          app.showBadges(stats['playerTypes'], function() {
            var recos = responseData['recommendations'],
                i,
                recosLen = recos.length;

            if (recosLen) {
              for (i = 0; i < recosLen; i++) {
                $('<a href=""><img src="'+ recos[i].url +'" /></a>').appendTo('#final-results');
              }

              app.showFinalRecos();
            }
          });
        }, 4000);
      }
    }); 
  },

  formatMs: function(ms) {
    return (parseInt(ms, 10) / 1000).toFixed(2);
  },

  showBadges: function(badges, callback) {
    var i = 0,
        badge_id_to_file = {
          "CHEAP_DATE": "cheap_date",
          "COMPLETIONIST": "completionist",
          "FAST_FINISHER": "fast_finisher",
          "HIGH_MAINTENANCE": "high_maintenance",
          "SLOW_POKE": "slow_poke",
          "OLD_FOGEY": "old_fogey"
        };

    var badgesInterval = setInterval(function() { 
      console.log('show badge', i)
      showBadge(badge_id_to_file[badges[i]], i);
      i++;

      if (i == badges.length) {
        clearInterval(badgesInterval);

        setTimeout(function() {
          $('#badges').addClass('off');
          if (callback) callback.call(this);
        }, 5000);
      }
    }, 2000);

    function showBadge(file, i) {
      $('<a class="badge-wrapper" href=""><img class="badge badge-'+i+'" src="img/badges/'+file+'.png"></a>').appendTo('#badge-container');
    }
  },

  showFinalRecos: function() {
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
      rval = (rval.toFixed(1) * 100) / 100;  
    }
    return rval;
  },

  showBetweenRoundPanel: function() {
    $('#end-of-round').addClass('shown');
    app.chooseRandomSaying();
    app.updateRoundCounter();
  },

  delayedStartNextRound: function() {
    setTimeout(function() {
      checkRoundLoaded = setInterval(function() {
        console.log('loaded?', data.roundLoaded)
        if (data.roundLoaded) {
          clearInterval(checkRoundLoaded);
          app.startNextRound();
          $('#end-of-round').removeClass('shown');
        }
      }, 200);

      // Safety if we don't ever get a response
      setTimeout(function() {
        if (!data.roundLoaded) {
          console.log('Timed out!');
          clearInterval(checkRoundLoaded);
        }
      }, 2000);
    }, data.betweenPanelLength - 200);
  },

  chooseRandomSaying: function() {
    var sayings = $('#sayings-from-the-soul'),
        sayingsWhileYouWait = [
          'Proxying getsticulation request...', 
          'Breaching the primary pressure boundry...',
          'Pressurized ejection commencing...',
          'Experiencing rapid oxidation...',
          'Configuring breeding algorithm...',
          'Relocating to the lower plemun...',
          'Fuel ballooning in progress...'
    ];

    var sayingInterval = setInterval(function() {
      var randomIndex = Math.floor(Math.random() * (sayingsWhileYouWait.length)),
          randomSaying = sayingsWhileYouWait[randomIndex];

      sayings.html(randomSaying);
    }, 1500);

    setTimeout(function() {
      clearInterval(sayingInterval);
    }, data.betweenPanelLength)
  },

  startNextRound: function() {
    $('#start-round-title').html('Round ' + data.currentRound);
    data.cdPanel.addClass('shown').removeClass('off');
    data.cdStart = 2;
    data.cdTimer.html(data.cdStart);
    app.doCountdown();
    countdownInterval = setInterval(app.doCountdown, 1000);
  },

  doCountdown: function() {
    data.cdTimer.html(data.cdStart--);
    if (!data.cdStart) {
      clearInterval(countdownInterval);

      setTimeout(function() {
        data.cdTimer.html('Start!');

        setTimeout(function() {
          data.cdPanel.addClass('off').removeClass('shown');
          data.itemTimeStarted = new Date().getTime();
          app.startTimer();
          $('#panel-game').addClass('loaded');
        }, 500)
      }, 1000);
    }
  },

  resetRoundPanel: function() {
    var round = app.getCurrentRound();
    app.showSidebar('love', false);
    app.showSidebar('nah', false);
    $('#position').css('width', '0%');
    $('.count').html('0');
    $('#panel-game').removeClass('loaded');

    var roundNum = round ? round.roundNumber : 1;
    $('#round-title').html('Round ' + roundNum);
  },

  loadRound: function() {
    var roundNumber = app.getCurrentRound().roundNumber;

    console.log('ROUND LOADED')
    data.roundLoaded = true;
    var items = null;

    if (roundNumber == 1) {
      items = app.getInitialRoundData(function(responseData) {
        if ((data.gameId == -1) || (data.gameId != responseData.gameId)) {
         data.gameId = responseData.gameId;
        }
        console.log(responseData.recommendations);
        app.loadImages(responseData.recommendations);
      });
    }
    // Send all other round data for round X where: 1 < x < totalRounds.
    else {
      items = app.sendRoundResults(function(responseData) {
         console.log(responseData);
         app.loadImages(responseData.recommendations);
      });
    }
  },

  // AJAX request that sends profile data
  getInitialRoundData: function(callback) {
    $.ajax({
      dataType: 'jsonp',
      type: 'get',
      url: 'http://ohsnap.elasticbeanstalk.com/game/startG?' + app.generateParamsStringForInitialRoundRequest(),
      success: function(data) {
        console.log(data);
        if (callback) callback.call(this, data);
      },
      error: function(xhr, status, error) {
        console.log('getInitialRoundData status: ' + status);
      }
    });
  },

  generateParamsStringForInitialRoundRequest: function() {
    var categories = $('.toggles .active').pluck('id').join(',');

    console.log(data.deviceId);
    var rval =  'gender=' + data.gender + 
                '&custId=' + data.deviceId + 
                '&categories=' + categories + 
                '&recommendationSize=' + data.itemCountToRequest[1];

    console.log('initial: ' + rval);
    return rval;
  },

  // Sending round results for rounds X where 1 < X < last round
  sendRoundResults: function(callback) {
  console.log('in sendRoundResults');
  console.log('RoundResultsParams', app.generateParamsStringForRoundResultsRequest());
  $.ajax({
      dataType: 'jsonp',
      type: 'get',
      url: 'http://ohsnap.elasticbeanstalk.com/game/roundResultsG?' + app.generateParamsStringForRoundResultsRequest(),
      success: function(data) {
        console.log(data);
        if (callback) callback.call(this, data);
      },
      error: function(xhr, status, error) {
        console.log('sendRoundResults status: ' + status);
      }
    });  
  },

  sendFinalRoundResults: function(callback) {
    $.ajax({
        dataType: 'jsonp',
        type: 'get',
        url: 'http://ohsnap.elasticbeanstalk.com/game/finishGameG?' + app.generateParamsStringForRoundResultsRequest(),
        success: function(data) {
          if (callback) callback.call(this, data);
        },
        error: function(xhr, status, error) {
          console.log('sendRoundResults status: ' + status);
        }
      });    
  },

  generateParamsStringForRoundResultsRequest: function() {
    var currentRound = app.getCurrentRound().roundNumber;
    var roundActions = app.generateRoundActionString(currentRound - 1);

    var rval =  'custId=' + data.deviceId +
                '&gameId=' + data.gameId +
                '&roundId=' + currentRound +
                '&recommendationSize=' + data.itemCountToRequest[currentRound] +
                '&roundActions=' + roundActions;

    return rval;
  },

  generateRoundActionString: function(roundNumber) {
    console.log('roundNumber', roundNumber)
    var itemResults = data.rounds[roundNumber].itemResults;

    var paramsArray = [],
        i,
        itemResultsLength = itemResults.length;

    for (i = 0; i < itemResultsLength; i++) {
      var resultArray = [];

      console.log("itemResult", itemResults[i]);

      resultArray.push(itemResults[i].styleId);
      resultArray.push(itemResults[i].productId);
      resultArray.push(itemResults[i].like);
      resultArray.push(itemResults[i].timeToDecide);

      paramsArray.push(resultArray.join(':'))
      console.log('resultArray', resultArray);
    }
    var rval = paramsArray.join(',');
    console.log('resultArray', paramsArray);
    console.log('rval',rval);
    return rval;
  },


  loadImages: function(items) {
    var i, len, round = app.getCurrentRound();

    round.countItems = items.length;
    round.items = items;

    len = round.countItems;
    for (i = 0; i < len; i++) {
      var item = round.items[i];
      $('<img class="item-image centered" styleId="' + item.styleId + 
          '" productId="' + item.productId +
          '" src="'+item.url+'">').appendTo('#game-images');
    }

    data.imgWidth = $('.item-image').width();
    data.imgHalf = data.imgWidth / 2;

    app.bindItemImageEvents();
  },

  startTimer: function() {
    data.roundCountdown = data.timings[data.currentRound] * 1000;
    console.log('start timer', data.roundCountdown);
    app.updateTimer(data.roundCountdown);
    app.incrementTimer();
  },

  incrementTimer: function() {
    data.roundCountdown -= 10;

    if (data.roundCountdown < 10) {
      clearTimeout(timerInterval);
      $('#timer').html('00:000');
      if (!app.getCurrentRound().roundComplete)
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
      .on('touchmove', function(e) {
        if (data.noScroll) e.preventDefault();
      });
  }

};
