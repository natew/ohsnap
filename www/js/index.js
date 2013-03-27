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

var data = {
  panels: [],
  panelIndex: 0,
  gender: null
};

var app = {

  // Application Constructor
  initialize: function() {
    this.bindEvents();
    this.setupButtons();
    this.setupPanels();
    this.setupGender();
    this.setupCategories();
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

      $.ajax({
        type: 'POST',
        url: '',
        data: {
          gender: data.gender,
          categories: $('.toggles .active').pluck('id')
        },
        success: function(data) {
          // this.setupGame(data);
          el.addClass('btn-next').trigger('tap');
        }
      });
    });
  },

  setupGender: function() {
    $('#male,#female').click(function() {
      data.gender = $(this).attr('id');
    });
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