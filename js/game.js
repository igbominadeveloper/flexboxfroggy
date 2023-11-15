const validFlexProperties = [
  'justify-content',
  'align-items',
  'order',
  'flex-direction',
  'flex-wrap',
  'flex',
  'flex-basis',
  'flex-flow',
  'flex-grow',
  'flex-shrink',
  'align-content',
  'align-self',
];

const validFlexValues = [
  'row',
  'row-reverse',
  'column',
  'column-reverse',
  'wrap',
  'wrap-reverse',
  'nowrap',
  'baseline',
  'stretch',
  'flex-end',
  'flex-start',
  'end',
  'space-between',
  'space-around',
  'space-evenly',
  'center',
  'auto',
];

var game = {
  colorblind:
    (localStorage.colorblind && JSON.parse(localStorage.colorblind)) || 'false',
  language: window.location.hash.substring(1) || 'en',
  difficulty: 'easy',
  level: parseInt(localStorage.level, 10) || 0,
  answers: (localStorage.answers && JSON.parse(localStorage.answers)) || {},
  solved: (localStorage.solved && JSON.parse(localStorage.solved)) || [],
  user: localStorage.user || '',
  changed: false,
  clickedCode: null,

  start: function () {
    // navigator.language can include '-'
    // ref: https://developer.mozilla.org/en-US/docs/Web/API/NavigatorLanguage/language
    var requestLang = window.navigator.language.split('-')[0];
    if (
      window.location.hash === '' &&
      requestLang !== 'en' &&
      messages.languageActive.hasOwnProperty(requestLang)
    ) {
      game.language = requestLang;
      window.location.hash = requestLang;
    }

    game.translate();
    $('#level-counter .total').text(levels.length);
    $('#editor').show();
    $('#share').hide();
    $('#language').val(game.language);
    $('input[value="' + game.colorblind + '"]', '#colorblind').prop(
      'checked',
      true
    );

    if (!localStorage.user) {
      game.user =
        '' + new Date().getTime() + Math.random().toString(36).slice(1);
      localStorage.setItem('user', game.user);
    }

    this.setHandlers();
    this.loadMenu();
    game.loadLevel(levels[game.level]);
  },

  setHandlers: function () {
    $('#next').on('click', function () {
      $('#code').focus();

      if ($(this).hasClass('disabled')) {
        if (!$('.frog').hasClass('animated')) {
          game.tryagain();
        }

        return;
      }

      $(this).removeClass('animated animation');
      $('.frog').addClass('animated bounceOutUp');
      $('.arrow, #next').addClass('disabled');

      setTimeout(function () {
        if (game.level >= levels.length - 1) {
          game.win();
        } else {
          game.next();
        }
      }, 2000);
    });

    $('#code')
      .on('keydown', function (e) {
        if (e.keyCode === 13) {
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            game.check();
            $('#next').click();
            return;
          }

          var max = $(this).data('lines');
          var code = $(this).val();
          var trim = code.trim();
          var codeLength = code.split('\n').length;
          var trimLength = trim.split('\n').length;

          if (codeLength >= max) {
            if (codeLength === trimLength) {
              e.preventDefault();
              $('#next').click();
            } else {
              $('#code').focus().val('').val(trim);
            }
          }
        }
      })
      .on('input', game.debounce(game.check, 500))
      .on('input', function () {
        game.changed = true;
        $('#next').removeClass('animated animation').addClass('disabled');
      });

    $('#editor').on(
      'webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend',
      function () {
        $(this).removeClass();
      }
    );

    $('#labelReset').on('click', function () {
      var warningReset =
        messages.warningReset[game.language] || messages.warningReset.en;
      var r = confirm(warningReset);

      if (r) {
        game.level = 0;
        game.answers = {};
        game.solved = [];
        game.loadLevel(levels[0]);

        $('.level-marker').removeClass('solved');
      }
    });

    $('#labelSettings').on('click', function () {
      $('#levelsWrapper').hide();
      $('#settings .tooltip').toggle();
      $('#instructions .tooltip').remove();
    });

    $('#language').on('change', function () {
      window.location.hash = $(this).val();
    });

    $('#difficulty').on('change', function () {
      game.difficulty = $('input:checked', '#difficulty').val();

      // setting height will prevent a slight jump when the animation starts
      var $instructions = $('#instructions');
      var height = $instructions.height();
      $instructions.css('height', height);

      var $markers = $('.level-marker');

      if (game.difficulty == 'hard' || game.difficulty == 'medium') {
        $instructions.slideUp();

        $markers.each(function () {
          var $marker = $(this);
          if ($marker[0].hasAttribute('title')) {
            $marker.attr('data-title', $marker.attr('title'));
            $marker.removeAttr('title');
          }
        });
      } else {
        $instructions.css('height', '').slideDown();

        $markers.each(function () {
          var $marker = $(this);
          if ($marker[0].hasAttribute('data-title')) {
            $marker.attr('title', $marker.attr('data-title'));
            $marker.removeAttr('data-title');
          }
        });
      }
    });

    $('#colorblind').on('change', function () {
      game.colorblind = $('input:checked', '#colorblind').val();

      if (game.colorblind == 'true') {
        $('.lilypad, .frog').addClass('cb-friendly');
      } else {
        $('.lilypad, .frog').removeClass('cb-friendly');
      }
    });

    $('body').on('click', function () {
      $('.tooltip').hide();
      clickedCode = null;
    });

    $('.tooltip, .toggle, #level-indicator').on('click', function (e) {
      e.stopPropagation();
    });

    $(window)
      .on('beforeunload', function () {
        game.saveAnswer();
        localStorage.setItem('level', game.level);
        localStorage.setItem('answers', JSON.stringify(game.answers));
        localStorage.setItem('solved', JSON.stringify(game.solved));
        localStorage.setItem('colorblind', JSON.stringify(game.colorblind));
      })
      .on('hashchange', function () {
        game.language = window.location.hash.substring(1) || 'en';
        game.translate();

        $('#tweet iframe').remove();
        var html =
          '<a href="https://twitter.com/share" class="twitter-share-button"{count} data-url="https://flexboxfroggy.com" data-via="thomashpark">Tweet</a> ' +
          '<a href="https://twitter.com/thomashpark" class="twitter-follow-button" data-show-count="false">Follow @thomashpark</a>';
        $('#tweet').html(html);

        if (typeof twttr !== 'undefined') {
          twttr.widgets.load();
        }

        if (game.language === 'en') {
          history.replaceState({}, document.title, './');
        }
      });
  },

  prev: function () {
    this.level--;

    var levelData = levels[this.level];
    this.loadLevel(levelData);
  },

  next: function () {
    if (this.difficulty === 'hard') {
      this.level = Math.floor(Math.random() * levels.length);
    } else {
      this.level++;
    }

    var levelData = levels[this.level];
    this.loadLevel(levelData);
  },

  loadMenu: function () {
    levels.forEach(function (level, i) {
      var levelMarker = $('<span/>')
        .addClass('level-marker')
        .attr({ 'data-level': i, title: level.name })
        .text(i + 1);

      if ($.inArray(level.name, game.solved) !== -1) {
        levelMarker.addClass('solved');
      }

      levelMarker.appendTo('#levels');
    });

    $('.level-marker').on('click', function () {
      game.saveAnswer();

      var level = $(this).attr('data-level');
      game.level = parseInt(level, 10);
      game.loadLevel(levels[level]);
    });

    $('#level-indicator').on('click', function () {
      $('#settings .tooltip').hide();
      $('#levelsWrapper').toggle();
      $('#instructions .tooltip').remove();
    });

    $('.arrow.left').on('click', function () {
      if ($(this).hasClass('disabled')) {
        return;
      }

      game.saveAnswer();
      game.prev();
    });

    $('.arrow.right').on('click', function () {
      if ($(this).hasClass('disabled')) {
        return;
      }

      game.saveAnswer();
      game.next();
    });
  },

  loadLevel: function (level) {
    $('#editor').show();
    $('#share').hide();
    $('#background, #pond').removeClass('wrap').attr('style', '').empty();
    $('#levelsWrapper').hide();
    $('.level-marker')
      .removeClass('current')
      .eq(this.level)
      .addClass('current');
    $('#level-counter .current').text(this.level + 1);
    $('#before').text(level.before);
    $('#after').text(level.after);
    $('#next').removeClass('animated animation').addClass('disabled');

    var instructions =
      level.instructions[game.language] || level.instructions.en;
    $('#instructions').html(instructions);

    $('.arrow.disabled').removeClass('disabled');

    if (this.level === 0) {
      $('.arrow.left').addClass('disabled');
    }

    if (this.level === levels.length - 1) {
      $('.arrow.right').addClass('disabled');
    }

    var answer = game.answers[level.name];
    $('#code').val(answer).focus();

    this.loadDocs();

    var lines = Object.keys(level.style).length;
    $('#code')
      .height(20 * lines)
      .data('lines', lines);

    var string = level.board;
    var markup = '';
    var colors = {
      g: 'green',
      r: 'red',
      y: 'yellow',
    };

    for (var i = 0; i < string.length; i++) {
      var c = string.charAt(i);
      var color = colors[c];

      var lilypad = $('<div/>')
        .addClass(
          'lilypad ' + color + (this.colorblind == 'true' ? ' cb-friendly' : '')
        )
        .data('color', color);
      var frog = $('<div/>')
        .addClass(
          'frog ' + color + (this.colorblind == 'true' ? ' cb-friendly' : '')
        )
        .data('color', color);

      $('<div/>').addClass('bg').css(game.transform()).appendTo(lilypad);
      $('<div/>').addClass('bg animated pulse infinite').appendTo(frog);

      $('#background').append(lilypad);
      $('#pond').append(frog);
    }

    var classes = level.classes;

    if (classes) {
      for (var rule in classes) {
        $(rule).addClass(classes[rule]);
      }
    }

    var selector = level.selector || '';
    $('#background ' + selector).css(level.style);

    game.changed = false;
    game.applyStyles();
    game.check();
  },

  loadDocs: function () {
    $('#instructions code').each(function () {
      var code = $(this);
      var text = code.text();

      if (text in docs) {
        code.addClass('help');
        code.on('click', function (e) {
          e.stopPropagation();

          // If click same code when tooltip already displayed, just remove current tooltip.
          if (
            $('#instructions .tooltip').length !== 0 &&
            clickedCode === code
          ) {
            $('#instructions .tooltip').remove();
            return;
          }

          $('#levelsWrapper').hide();
          $('#settings .tooltip').hide();
          $('#instructions .tooltip').remove();
          var html = docs[text][game.language] || docs[text].en;
          var tooltipX = code.offset().left;
          var tooltipY = code.offset().top + code.height() + 13;
          $('<div class="tooltip"></div>')
            .html(html)
            .css({
              top: tooltipY,
              left: tooltipX,
            })
            .appendTo($('#instructions'));

          var getDefaultPropVal = (pValue) => {
            if (pValue == '<integer>') return '0';
            else if (pValue == '<flex-direction>') return 'row nowrap';

            return pValue;
          };

          $('#instructions .tooltip code').on('click', function (event) {
            var pName = text;
            var pValue = event.target.textContent.split(' ')[0];
            pValue = getDefaultPropVal(pValue);
            game.writeCSS(pName, pValue);

            game.check();
          });
          clickedCode = code;
        });
      }
    });
  },

  applyStyles: function () {
    var level = levels[game.level];
    var code = $('#code').val();
    var selector = level.selector || '';
    $('#pond ' + selector).attr('style', code);
    game.saveAnswer();
  },

  check: function () {
    game.applyStyles();

    var level = levels[game.level];
    var lilypads = {};
    var frogs = {};
    var correct = true;

    $('.frog').each(function () {
      var position = $(this).position();
      position.top = Math.floor(position.top);
      position.left = Math.floor(position.left);

      var key = JSON.stringify(position);
      var val = $(this).data('color');
      frogs[key] = val;
    });

    $('.lilypad').each(function () {
      var position = $(this).position();
      position.top = Math.floor(position.top);
      position.left = Math.floor(position.left);

      var key = JSON.stringify(position);
      var val = $(this).data('color');

      if (!(key in frogs) || frogs[key] !== val) {
        correct = false;
      }
    });

    if (correct) {
      ga('send', {
        hitType: 'event',
        eventCategory: level.name,
        eventAction: 'correct',
        eventLabel: $('#code').val(),
      });

      if ($.inArray(level.name, game.solved) === -1) {
        game.solved.push(level.name);
      }

      $('[data-level=' + game.level + ']').addClass('solved');
      $('#next').removeClass('disabled').addClass('animated animation');
    } else {
      ga('send', {
        hitType: 'event',
        eventCategory: level.name,
        eventAction: 'incorrect',
        eventLabel: $('#code').val(),
      });

      game.changed = true;
      $('#next').removeClass('animated animation').addClass('disabled');
    }
  },

  saveAnswer: function () {
    var level = levels[this.level];
    game.answers[level.name] = $('#code').val();
  },

  tryagain: function () {
    $('#editor').addClass('animated shake');
  },

  win: function () {
    var solution = $('#code').val();

    this.loadLevel(levelWin);

    $('#editor').hide();
    $('#code').val(solution);
    $('#share').show();
    $('.frog .bg').removeClass('pulse').addClass('bounce');
  },

  transform: function () {
    var scale = 1 + (Math.random() / 5 - 0.2);
    var rotate = 360 * Math.random();

    return { transform: 'scale(' + scale + ') rotate(' + rotate + 'deg)' };
  },

  translate: function () {
    document.title = messages.title[game.language] || messages.title.en;
    $('html').attr('lang', game.language);

    var level = $('#editor').is(':visible') ? levels[game.level] : levelWin;
    var instructions =
      level.instructions[game.language] || level.instructions.en;
    $('#instructions').html(instructions);
    game.loadDocs();

    $('.translate').each(function () {
      var label = $(this).attr('id');
      if (messages[label]) {
        var text = messages[label][game.language] || messages[label].en;
      }

      $('#' + label).text(text);
    });
  },

  debounce: function (func, wait, immediate) {
    var timeout;
    return function () {
      var context = this,
        args = arguments;
      var later = function () {
        timeout = null;
        if (!immediate) func.apply(context, args);
      };
      var callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if (callNow) func.apply(context, args);
    };
  },

  writeCSS: function (pName, pValue) {
    var tokens = $('#code')
      .val()
      .trim()
      .split(/[\n:;]+/)
      .filter((i) => i);
    var keywords = Object.keys(docs);
    var content = '';
    var filled = false;

    // Do nothing when click property name inside Tooltip
    if (keywords.includes(pValue)) return;

    tokens.forEach(function (token, i) {
      var trimmedToken = token.trim();
      if (!keywords.includes(trimmedToken)) {
        return;
      }

      var append = content !== '' ? '\n' : '';
      if (trimmedToken === pName && !filled) {
        filled = true;
        append += trimmedToken + ': ' + pValue + ';';
      } else if (i + 1 < tokens.length) {
        var val = !keywords.includes(tokens[i + 1].trim())
          ? tokens[i + 1].trim()
          : ''; // TODO: Maybe prop value validiation required
        append += trimmedToken + ': ' + val + ';';
      }

      content += append;
    });

    if (!filled) {
      content += content !== '' ? '\n' : '';
      content += pName + ': ' + pValue + ';';
    }

    $('#code').val(content);
    $('#code').focus();
  },
  initAutocomplete: function () {
    const flexInput = document.getElementById('code');
    const autocompleteContainer = document.createElement('div');
    autocompleteContainer.id = 'autocompleteContainer';
    flexInput.parentNode.insertBefore(
      autocompleteContainer,
      flexInput.nextSibling
    );

    flexInput.parentNode.parentElement.style.position = 'relative';

    flexInput.addEventListener('input', showAutocomplete);

    function getAutoCompleteTemplate(properties) {
      return properties
        .map(
          (value) => `<div class='autocomplete-property code'>${value}</div>`
        )
        .join('');
    }

    function showAutocomplete() {
      const inputValue = flexInput.value.trim();
      const caretPosition = getCaretPosition(flexInput);

      const lines = inputValue.split('\n');
      const currentLineIndex =
        inputValue.substr(0, caretPosition).split('\n').length - 1;
      const currentLine = lines[currentLineIndex];

      let autocompleteHTML = '';

      if (inputValue.length > 0) {
        if (caretPosition > currentLine.indexOf(':')) {
          const flexValuesAutocomplete = getFlexPropValues(
            currentLine,
            caretPosition
          );

          // for the values, nothing should show if the user hasn't started typing anything in the value part

          autocompleteHTML = getAutoCompleteTemplate(flexValuesAutocomplete);
        } else {
          const flexPropsAutocomplete = getFlexPropValues(currentLine);
          autocompleteHTML = getAutoCompleteTemplate(flexPropsAutocomplete);
        }
      }

      if (autocompleteHTML.length > 0 && inputValue.length > 0) {
        autocompleteContainer.innerHTML = autocompleteHTML;
        autocompleteContainer.style.display = 'block';
        autocompleteContainer.style.top = '95px';
        autocompleteContainer.classList.add('tooltip');
      } else {
        autocompleteContainer.style.display = 'none';
      }
    }

    autocompleteContainer.addEventListener('click', applyAutocomplete);

    function applyAutocomplete(event) {
      if (event.target.tagName === 'DIV') {
        const selectedValue = event.target.textContent;
        const currentValue = flexInput.value.trim();
        const caretPosition = getCaretPosition(flexInput);

        // Split the current value into prefix and suffix
        const prefix = currentValue.substring(0, caretPosition);
        const suffix = currentValue.substring(caretPosition);

        // Extract the existing property name and value
        const [, existingPropertyName, _existingPropertyValue] =
          prefix.match(/([a-zA-Z-]+):\s*([^;]*)$/) ?? [];

        // Create the new value by replacing only the property value
        const newValue = existingPropertyName
          ? `${existingPropertyName}: ${selectedValue}${suffix}`
          : `${selectedValue}${suffix}`;

        flexInput.value = newValue;
        autocompleteContainer.style.display = 'none';
        flexInput.focus();
      }
    }

    document.addEventListener('click', function (event) {
      if (
        !autocompleteContainer.contains(event.target) &&
        event.target !== flexInput
      ) {
        autocompleteContainer.style.display = 'none';
      }
    });

    function getCaretPosition(element) {
      return element.selectionStart;
    }

    function getFlexPropValues(prefix) {
      if (prefix.indexOf(':') === -1) {
        // Caret is before the ":"; suggest properties
        return validFlexProperties.filter((property) =>
          property.startsWith(prefix)
        );
      }
      // Caret is after the ":"; suggest values using the text after the ":"
      const flexValuePrefix = prefix.split(':')[1].trim();

      return flexValuePrefix.length > 0
        ? validFlexValues.filter((value) => value.startsWith(flexValuePrefix))
        : [];
    }
  },
};

$(document).ready(function () {
  game.start();
  game.initAutocomplete();
});
