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

// Phone unique identifier.  Must not contain a '#'
var deviceId = "0H5N4P";

var gameId = -1;

var data = {
  panels: [],
  panelIndex: 0,
  gender: null,
  timings: { 1: 5, 2: 20, 3: 15 }
};

// Tracking current round state
var currentRoundData = {
  items: [],
  countItems: 0,
  countCompletedItems: 0,
  countLiked: 0,
  countDisliked: 0,
  roundComplete: false,
  roundResults: new RoundResult(),
  currentItem: null
}

var app = {

  // Application Constructor
  initialize: function() {
    this.bindEvents();
    this.setupButtons();
    this.setupPanels();
    this.setupGender();
    this.setupCategories();
    this.setupItemImages();
  },

  setupPanels: function() {
    $('.panel').each(function() {
      data.panels.push($(this));
    });

    $('#panels').on('next', '.panel', function() {
      data.panelIndex++;
      $(this).addClass('off');
    });

    $('#panels').on('prev', '.panel', function() {
      data.panelIndex--;
      data.panels[data.panelIndex].removeClass('off');
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

    $('#btn-start').one('tap', function() {
      var el = $(this);
      el.html('Loading...');
      el.addClass('btn-next');
      currentRoundData.roundResults.roundId++;
      app.getRound(currentRoundData.roundResults.roundId);
    });
  },

  setupGender: function() {
    $('#male,#female').on('tap', function() {
      data.gender = $(this).attr('id');
    });
  },

  setupItemImages: function() {
    $('#game-images').on('swipeRight', function() {
      app.recordItemResult(true);
      $('#love .count').html(++currentRoundData.countLiked); 
    });

    $('#game-images').on('swipeLeft', function() {
      app.recordItemResult(false);
      $('#nah .count').html(++currentRoundData.countDisliked); 
    });  
  },

  recordItemResult: function(like) {
    var itemsRemaining = currentRoundData.items.length

    // Only do stuff if the round needs to be finished.
    if (!currentRoundData.roundComplete) {

      // Create a result object and add it to the round results array.
      var itemResult = new ItemResult(like);
      currentRoundData.roundResults.itemResults.push(itemResult);

      if(itemsRemaining > 0) {
          currentRoundData.countCompletedItems++;
          if (currentRoundData.countItems > 0) {
            var percentDone = 
              Math.round(currentRoundData.countCompletedItems * 100/currentRoundData.countItems);

            $('#position').css('width', percentDone + '%');  
          }
          currentRoundData.currentItem = currentRoundData.items.pop();
          $('#item-image').attr('src', currentRoundData.currentItem.url);
      }
      // When this is the last item.
      else {
          currentRoundData.countCompletedItems++;
          currentRoundData.roundComplete = true;
          $('#position').css('width', '100%');
          $('#item-image').attr('src', 'img/happy-face.png');
      }
    }
  },

  getRound: function(round) {

    var items = [
      {"url":"http://www.zappos.com/images/z/1/9/5/8/8/3/1958832-t-THUMBNAIL.jpg","id":"1958832"},{"url":"http://www.zappos.com/images/z/2/0/0/8/2/9/2008296-t-THUMBNAIL.jpg","id":"2008296"},{"url":"http://www.zappos.com/images/z/2/0/0/8/2/9/2008295-t-THUMBNAIL.jpg","id":"2008295"},{"url":"http://www.zappos.com/images/z/1/9/0/2/0/5/1902054-t-THUMBNAIL.jpg","id":"1902054"},{"url":"http://www.zappos.com/images/z/1/9/0/2/0/5/1902055-t-THUMBNAIL.jpg","id":"1902055"}
    ];

    app.loadRound(round, items);

    if (false) {
      $.ajax({
        dataType: 'JSONP',
        type: 'GET',
        url: 'http://ohsnap.elasticbeanstalk.com/recommendation/custId/1/resultSize/10',
        success: function(data) {
          console.log(data);
        }
      });
    }

    if (false) {
      $.ajax({
        type: 'POST',
        url: 'http://ohsnap.elasticbeanstalk.com/start',
        data: {
          gender: data.gender,
          categories: $('.toggles .active').pluck('id')
        },
        success: function(data) {
        }
      });
    }
  },

  loadRound: function(round, items) {
    app.loadImages(items);
    app.startTimer(round);
    $('#panel-game').addClass('loaded');
  },

  loadImages: function(items) {
    currentRoundData.countItems = items.length;

    currentRoundData.items = items;

    currentRoundData.currentItem = currentRoundData.items.pop();
    $('#item-image').attr('src', currentRoundData.currentItem.url); 
  },

  startTimer: function(round) {
    var roundLength = data.timings[round] * 1000;

    app.updateTimer(roundLength);

    timerInterval = setInterval(function() {
      roundLength -= 10;
      app.updateTimer(roundLength);
    }, 10);
  },

  updateTimer: function(total) {
    if (total <= 0) {
      clearInterval(timerInterval);
    }

    var s = Math.floor(total / 1000) + "",
        ms = (total % 1000) + "";

    while (s.length < 2) s = "0" + s;
    while (ms.length < 3) ms = "0" + ms;

    $('#timer').html(s + ':' + ms);
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

// Contains data on a single image/item 
function ItemResult(like) {
  this.imageId = '';
  this.like = like;
  this.timeToDecide = 0;
}

// Contains data for a single round
function RoundResult() {
  this.gameId = -1;
  this.roundId = 0;
  this.itemResults = [];
  this.deviceId = deviceId;
}


// $('body').swipeRight(function() {$('#intro').html('<li>right</li>');});
// $('body').swipeLeft(function() {$('#intro').html('<li>left</li>');});
// $('body').swipeUp(function() {$('#intro').html('<li>up</li>');});
// $('body').tap(function() {$('#intro').html('<li>tap</li>');});
// $('body').doubleTap(function() {$('#intro').html('<li>double tap</li>');});
// $('body').longTap(function() {$('#intro').html('long tap');});