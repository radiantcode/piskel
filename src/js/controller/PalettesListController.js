(function () {
  var ns = $.namespace('pskl.controller');

  var PRIMARY_COLOR_CLASSNAME = 'palettes-list-primary-color';
  var SECONDARY_COLOR_CLASSNAME = 'palettes-list-secondary-color';

  ns.PalettesListController = function (usedColorService) {
    this.usedColorService = usedColorService;
    this.paletteService = pskl.app.paletteService;
    this.paletteImportService = pskl.app.paletteImportService;
  };

  ns.PalettesListController.prototype.setPalette_ = function (palette) {
    console.log(palette);
    this.selectPalette(palette.id);
    this.paletteService.addDynamicPalette(palette);
    this.onPaletteListUpdated();
  };

  ns.PalettesListController.prototype.displayErrorMessage_ = function (message) {
   alert(message);
  };

  function dataURLtoFile(dataurl, filename) {
      var arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
          bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
      while(n--){
          u8arr[n] = bstr.charCodeAt(n);
      }
      return new File([u8arr], filename, {type:mime});
  }

  ns.PalettesListController.prototype.init = function () {
    this.paletteColorTemplate_ = pskl.utils.Template.get('palette-color-template');

    this.colorListContainer_ = document.querySelector('.palettes-list-colors');
    this.colorPaletteSelect_ = document.querySelector('.palettes-list-select');

    var createPaletteButton_ = document.querySelector('.create-palette-button');
    var editPaletteButton_ = document.querySelector('.edit-palette-button');

    this.colorPaletteSelect_.addEventListener('change', this.onPaletteSelected_.bind(this));
    this.colorListContainer_.addEventListener('mouseup', this.onColorContainerMouseup.bind(this));
    this.colorListContainer_.addEventListener('contextmenu', this.onColorContainerContextMenu.bind(this));

    createPaletteButton_.addEventListener('click', this.onCreatePaletteClick_.bind(this));
    editPaletteButton_.addEventListener('click', this.onEditPaletteClick_.bind(this));

    $.subscribe(Events.PALETTE_LIST_UPDATED, this.onPaletteListUpdated.bind(this));
    $.subscribe(Events.CURRENT_COLORS_UPDATED, this.fillColorListContainer.bind(this));
    $.subscribe(Events.PRIMARY_COLOR_SELECTED, this.highlightSelectedColors.bind(this));
    $.subscribe(Events.SECONDARY_COLOR_SELECTED, this.highlightSelectedColors.bind(this));
    $.subscribe(Events.USER_SETTINGS_CHANGED, $.proxy(this.onUserSettingsChange_, this));

    var shortcuts = pskl.service.keyboard.Shortcuts;
    pskl.app.shortcutService.registerShortcut(shortcuts.COLOR.PREVIOUS_COLOR, this.selectPreviousColor_.bind(this));
    pskl.app.shortcutService.registerShortcut(shortcuts.COLOR.NEXT_COLOR, this.selectNextColor_.bind(this));
    pskl.app.shortcutService.registerShortcut(shortcuts.COLOR.SELECT_COLOR, this.selectColorForKey_.bind(this));

    this.fillPaletteList();
    this.updateFromUserSettings();
    this.fillColorListContainer();

    var test = "data:;base64,R0lNUCBQYWxldHRlDQpOYW1lOiBDdXJyZW50IGNvbG9ycyBjbG9uZQ0KQ29sdW1uczogMA0KIw0KIDAgMCAwIFVudGl0bGVkDQogMCAwIDg1IFVudGl0bGVkDQogMCAwIDE3MCBVbnRpdGxlZA0KIDAgMCAyNTUgVW50aXRsZWQNCiAwIDM2IDAgVW50aXRsZWQNCiAwIDM2IDg1IFVudGl0bGVkDQogMCAzNiAxNzAgVW50aXRsZWQNCiAwIDM2IDI1NSBVbnRpdGxlZA0KIDAgNzIgMCBVbnRpdGxlZA0KIDAgNzIgODUgVW50aXRsZWQNCiAwIDcyIDE3MCBVbnRpdGxlZA0KIDAgNzIgMjU1IFVudGl0bGVkDQogMCAxMDkgMCBVbnRpdGxlZA0KIDAgMTA5IDg1IFVudGl0bGVkDQogMCAxMDkgMTcwIFVudGl0bGVkDQogMCAxMDkgMjU1IFVudGl0bGVkDQogMCAxNDUgMCBVbnRpdGxlZA0KIDAgMTQ1IDg1IFVudGl0bGVkDQogMCAxNDUgMTcwIFVudGl0bGVkDQogMCAxNDUgMjU1IFVudGl0bGVkDQogMCAxODIgMCBVbnRpdGxlZA0KIDAgMTgyIDg1IFVudGl0bGVkDQogMCAxODIgMTcwIFVudGl0bGVkDQogMCAxODIgMjU1IFVudGl0bGVkDQogMCAyMTggMCBVbnRpdGxlZA0KIDAgMjE4IDg1IFVudGl0bGVkDQogMCAyMTggMTcwIFVudGl0bGVkDQogMCAyMTggMjU1IFVudGl0bGVkDQogMCAyNTUgMCBVbnRpdGxlZA0KIDAgMjU1IDg1IFVudGl0bGVkDQogMCAyNTUgMTcwIFVudGl0bGVkDQogMCAyNTUgMjU1IFVudGl0bGVkDQogMzYgMCAwIFVudGl0bGVkDQogMzYgMCA4NSBVbnRpdGxlZA0KIDM2IDAgMTcwIFVudGl0bGVkDQogMzYgMCAyNTUgVW50aXRsZWQNCiAzNiAzNiAwIFVudGl0bGVkDQogMzYgMzYgODUgVW50aXRsZWQNCiAzNiAzNiAxNzAgVW50aXRsZWQNCiAzNiAzNiAyNTUgVW50aXRsZWQNCiAzNiA3MiAwIFVudGl0bGVkDQogMzYgNzIgODUgVW50aXRsZWQNCiAzNiA3MiAxNzAgVW50aXRsZWQNCiAzNiA3MiAyNTUgVW50aXRsZWQNCiAzNiAxMDkgMCBVbnRpdGxlZA0KIDM2IDEwOSA4NSBVbnRpdGxlZA0KIDM2IDEwOSAxNzAgVW50aXRsZWQNCiAzNiAxMDkgMjU1IFVudGl0bGVkDQogMzYgMTQ1IDAgVW50aXRsZWQNCiAzNiAxNDUgODUgVW50aXRsZWQNCiAzNiAxNDUgMTcwIFVudGl0bGVkDQogMzYgMTQ1IDI1NSBVbnRpdGxlZA0KIDM2IDE4MiAwIFVudGl0bGVkDQogMzYgMTgyIDg1IFVudGl0bGVkDQogMzYgMTgyIDE3MCBVbnRpdGxlZA0KIDM2IDE4MiAyNTUgVW50aXRsZWQNCiAzNiAyMTggMCBVbnRpdGxlZA0KIDM2IDIxOCA4NSBVbnRpdGxlZA0KIDM2IDIxOCAxNzAgVW50aXRsZWQNCiAzNiAyMTggMjU1IFVudGl0bGVkDQogMzYgMjU1IDAgVW50aXRsZWQNCiAzNiAyNTUgODUgVW50aXRsZWQNCiAzNiAyNTUgMTcwIFVudGl0bGVkDQogMzYgMjU1IDI1NSBVbnRpdGxlZA0KIDcyIDAgMCBVbnRpdGxlZA0KIDcyIDAgODUgVW50aXRsZWQNCiA3MiAwIDE3MCBVbnRpdGxlZA0KIDcyIDAgMjU1IFVudGl0bGVkDQogNzIgMzYgMCBVbnRpdGxlZA0KIDcyIDM2IDg1IFVudGl0bGVkDQogNzIgMzYgMTcwIFVudGl0bGVkDQogNzIgMzYgMjU1IFVudGl0bGVkDQogNzIgNzIgMCBVbnRpdGxlZA0KIDcyIDcyIDg1IFVudGl0bGVkDQogNzIgNzIgMTcwIFVudGl0bGVkDQogNzIgNzIgMjU1IFVudGl0bGVkDQogNzIgMTA5IDAgVW50aXRsZWQNCiA3MiAxMDkgODUgVW50aXRsZWQNCiA3MiAxMDkgMTcwIFVudGl0bGVkDQogNzIgMTA5IDI1NSBVbnRpdGxlZA0KIDcyIDE0NSAwIFVudGl0bGVkDQogNzIgMTQ1IDg1IFVudGl0bGVkDQogNzIgMTQ1IDE3MCBVbnRpdGxlZA0KIDcyIDE0NSAyNTUgVW50aXRsZWQNCiA3MiAxODIgMCBVbnRpdGxlZA0KIDcyIDE4MiA4NSBVbnRpdGxlZA0KIDcyIDE4MiAxNzAgVW50aXRsZWQNCiA3MiAxODIgMjU1IFVudGl0bGVkDQogNzIgMjE4IDAgVW50aXRsZWQNCiA3MiAyMTggODUgVW50aXRsZWQNCiA3MiAyMTggMTcwIFVudGl0bGVkDQogNzIgMjE4IDI1NSBVbnRpdGxlZA0KIDcyIDI1NSAwIFVudGl0bGVkDQogNzIgMjU1IDg1IFVudGl0bGVkDQogNzIgMjU1IDE3MCBVbnRpdGxlZA0KIDcyIDI1NSAyNTUgVW50aXRsZWQNCjEwOSAwIDAgVW50aXRsZWQNCjEwOSAwIDg1IFVudGl0bGVkDQoxMDkgMCAxNzAgVW50aXRsZWQNCjEwOSAwIDI1NSBVbnRpdGxlZA0KMTA5IDM2IDAgVW50aXRsZWQNCjEwOSAzNiA4NSBVbnRpdGxlZA0KMTA5IDM2IDE3MCBVbnRpdGxlZA0KMTA5IDM2IDI1NSBVbnRpdGxlZA0KMTA5IDcyIDAgVW50aXRsZWQNCjEwOSA3MiA4NSBVbnRpdGxlZA0KMTA5IDcyIDE3MCBVbnRpdGxlZA0KMTA5IDcyIDI1NSBVbnRpdGxlZA0KMTA5IDEwOSAwIFVudGl0bGVkDQoxMDkgMTA5IDg1IFVudGl0bGVkDQoxMDkgMTA5IDE3MCBVbnRpdGxlZA0KMTA5IDEwOSAyNTUgVW50aXRsZWQNCjEwOSAxNDUgMCBVbnRpdGxlZA0KMTA5IDE0NSA4NSBVbnRpdGxlZA0KMTA5IDE0NSAxNzAgVW50aXRsZWQNCjEwOSAxNDUgMjU1IFVudGl0bGVkDQoxMDkgMTgyIDAgVW50aXRsZWQNCjEwOSAxODIgODUgVW50aXRsZWQNCjEwOSAxODIgMTcwIFVudGl0bGVkDQoxMDkgMTgyIDI1NSBVbnRpdGxlZA0KMTA5IDIxOCAwIFVudGl0bGVkDQoxMDkgMjE4IDg1IFVudGl0bGVkDQoxMDkgMjE4IDE3MCBVbnRpdGxlZA0KMTA5IDIxOCAyNTUgVW50aXRsZWQNCjEwOSAyNTUgMCBVbnRpdGxlZA0KMTA5IDI1NSA4NSBVbnRpdGxlZA0KMTA5IDI1NSAxNzAgVW50aXRsZWQNCjEwOSAyNTUgMjU1IFVudGl0bGVkDQoxNDUgMCAwIFVudGl0bGVkDQoxNDUgMCA4NSBVbnRpdGxlZA0KMTQ1IDAgMTcwIFVudGl0bGVkDQoxNDUgMCAyNTUgVW50aXRsZWQNCjE0NSAzNiAwIFVudGl0bGVkDQoxNDUgMzYgODUgVW50aXRsZWQNCjE0NSAzNiAxNzAgVW50aXRsZWQNCjE0NSAzNiAyNTUgVW50aXRsZWQNCjE0NSA3MiAwIFVudGl0bGVkDQoxNDUgNzIgODUgVW50aXRsZWQNCjE0NSA3MiAxNzAgVW50aXRsZWQNCjE0NSA3MiAyNTUgVW50aXRsZWQNCjE0NSAxMDkgMCBVbnRpdGxlZA0KMTQ1IDEwOSA4NSBVbnRpdGxlZA0KMTQ1IDEwOSAxNzAgVW50aXRsZWQNCjE0NSAxMDkgMjU1IFVudGl0bGVkDQoxNDUgMTQ1IDAgVW50aXRsZWQNCjE0NSAxNDUgODUgVW50aXRsZWQNCjE0NSAxNDUgMTcwIFVudGl0bGVkDQoxNDUgMTQ1IDI1NSBVbnRpdGxlZA0KMTQ1IDE4MiAwIFVudGl0bGVkDQoxNDUgMTgyIDg1IFVudGl0bGVkDQoxNDUgMTgyIDE3MCBVbnRpdGxlZA0KMTQ1IDE4MiAyNTUgVW50aXRsZWQNCjE0NSAyMTggMCBVbnRpdGxlZA0KMTQ1IDIxOCA4NSBVbnRpdGxlZA0KMTQ1IDIxOCAxNzAgVW50aXRsZWQNCjE0NSAyMTggMjU1IFVudGl0bGVkDQoxNDUgMjU1IDAgVW50aXRsZWQNCjE0NSAyNTUgODUgVW50aXRsZWQNCjE0NSAyNTUgMTcwIFVudGl0bGVkDQoxNDUgMjU1IDI1NSBVbnRpdGxlZA0KMTgyIDAgMCBVbnRpdGxlZA0KMTgyIDAgODUgVW50aXRsZWQNCjE4MiAwIDE3MCBVbnRpdGxlZA0KMTgyIDAgMjU1IFVudGl0bGVkDQoxODIgMzYgMCBVbnRpdGxlZA0KMTgyIDM2IDg1IFVudGl0bGVkDQoxODIgMzYgMTcwIFVudGl0bGVkDQoxODIgMzYgMjU1IFVudGl0bGVkDQoxODIgNzIgMCBVbnRpdGxlZA0KMTgyIDcyIDg1IFVudGl0bGVkDQoxODIgNzIgMTcwIFVudGl0bGVkDQoxODIgNzIgMjU1IFVudGl0bGVkDQoxODIgMTA5IDAgVW50aXRsZWQNCjE4MiAxMDkgODUgVW50aXRsZWQNCjE4MiAxMDkgMTcwIFVudGl0bGVkDQoxODIgMTA5IDI1NSBVbnRpdGxlZA0KMTgyIDE0NSAwIFVudGl0bGVkDQoxODIgMTQ1IDg1IFVudGl0bGVkDQoxODIgMTQ1IDE3MCBVbnRpdGxlZA0KMTgyIDE0NSAyNTUgVW50aXRsZWQNCjE4MiAxODIgMCBVbnRpdGxlZA0KMTgyIDE4MiA4NSBVbnRpdGxlZA0KMTgyIDE4MiAxNzAgVW50aXRsZWQNCjE4MiAxODIgMjU1IFVudGl0bGVkDQoxODIgMjE4IDAgVW50aXRsZWQNCjE4MiAyMTggODUgVW50aXRsZWQNCjE4MiAyMTggMTcwIFVudGl0bGVkDQoxODIgMjE4IDI1NSBVbnRpdGxlZA0KMTgyIDI1NSAwIFVudGl0bGVkDQoxODIgMjU1IDg1IFVudGl0bGVkDQoxODIgMjU1IDE3MCBVbnRpdGxlZA0KMTgyIDI1NSAyNTUgVW50aXRsZWQNCjIxOCAwIDAgVW50aXRsZWQNCjIxOCAwIDg1IFVudGl0bGVkDQoyMTggMCAxNzAgVW50aXRsZWQNCjIxOCAwIDI1NSBVbnRpdGxlZA0KMjE4IDM2IDAgVW50aXRsZWQNCjIxOCAzNiA4NSBVbnRpdGxlZA0KMjE4IDM2IDE3MCBVbnRpdGxlZA0KMjE4IDM2IDI1NSBVbnRpdGxlZA0KMjE4IDcyIDAgVW50aXRsZWQNCjIxOCA3MiA4NSBVbnRpdGxlZA0KMjE4IDcyIDE3MCBVbnRpdGxlZA0KMjE4IDcyIDI1NSBVbnRpdGxlZA0KMjE4IDEwOSAwIFVudGl0bGVkDQoyMTggMTA5IDg1IFVudGl0bGVkDQoyMTggMTA5IDE3MCBVbnRpdGxlZA0KMjE4IDEwOSAyNTUgVW50aXRsZWQNCjIxOCAxNDUgMCBVbnRpdGxlZA0KMjE4IDE0NSA4NSBVbnRpdGxlZA0KMjE4IDE0NSAxNzAgVW50aXRsZWQNCjIxOCAxNDUgMjU1IFVudGl0bGVkDQoyMTggMTgyIDAgVW50aXRsZWQNCjIxOCAxODIgODUgVW50aXRsZWQNCjIxOCAxODIgMTcwIFVudGl0bGVkDQoyMTggMTgyIDI1NSBVbnRpdGxlZA0KMjE4IDIxOCAwIFVudGl0bGVkDQoyMTggMjE4IDg1IFVudGl0bGVkDQoyMTggMjE4IDE3MCBVbnRpdGxlZA0KMjE4IDIxOCAyNTUgVW50aXRsZWQNCjIxOCAyNTUgMCBVbnRpdGxlZA0KMjE4IDI1NSA4NSBVbnRpdGxlZA0KMjE4IDI1NSAxNzAgVW50aXRsZWQNCjIxOCAyNTUgMjU1IFVudGl0bGVkDQoyNTUgMCAwIFVudGl0bGVkDQoyNTUgMCA4NSBVbnRpdGxlZA0KMjU1IDAgMTcwIFVudGl0bGVkDQoyNTUgMCAyNTUgVW50aXRsZWQNCjI1NSAzNiAwIFVudGl0bGVkDQoyNTUgMzYgODUgVW50aXRsZWQNCjI1NSAzNiAxNzAgVW50aXRsZWQNCjI1NSAzNiAyNTUgVW50aXRsZWQNCjI1NSA3MiAwIFVudGl0bGVkDQoyNTUgNzIgODUgVW50aXRsZWQNCjI1NSA3MiAxNzAgVW50aXRsZWQNCjI1NSA3MiAyNTUgVW50aXRsZWQNCjI1NSAxMDkgMCBVbnRpdGxlZA0KMjU1IDEwOSA4NSBVbnRpdGxlZA0KMjU1IDEwOSAxNzAgVW50aXRsZWQNCjI1NSAxMDkgMjU1IFVudGl0bGVkDQoyNTUgMTQ1IDAgVW50aXRsZWQNCjI1NSAxNDUgODUgVW50aXRsZWQNCjI1NSAxNDUgMTcwIFVudGl0bGVkDQoyNTUgMTQ1IDI1NSBVbnRpdGxlZA0KMjU1IDE4MiAwIFVudGl0bGVkDQoyNTUgMTgyIDg1IFVudGl0bGVkDQoyNTUgMTgyIDE3MCBVbnRpdGxlZA0KMjU1IDE4MiAyNTUgVW50aXRsZWQNCjI1NSAyMTggMCBVbnRpdGxlZA0KMjU1IDIxOCA4NSBVbnRpdGxlZA0KMjU1IDIxOCAxNzAgVW50aXRsZWQNCjI1NSAyMTggMjU1IFVudGl0bGVkDQoyNTUgMjU1IDAgVW50aXRsZWQNCjI1NSAyNTUgODUgVW50aXRsZWQNCjI1NSAyNTUgMTcwIFVudGl0bGVkDQoyNTUgMjU1IDI1NSBVbnRpdGxlZA=="

    
    var file = dataURLtoFile(test, 'next.gpl');

    this.paletteImportService.read(file, this.setPalette_.bind(this), this.displayErrorMessage_.bind(this));
  };


  ns.PalettesListController.prototype.fillPaletteList = function () {
    var palettes = this.paletteService.getPalettes();

    var html = palettes.map(function (palette) {
      return pskl.utils.Template.replace('<option value="{{id}}">{{name}}</option>', palette);
    }).join('');
    this.colorPaletteSelect_.innerHTML = html;
  };

  ns.PalettesListController.prototype.fillColorListContainer = function () {
    var colors = this.getSelectedPaletteColors_();

    if (colors.length > 0) {
      var html = colors.map(function (color, index) {
        return pskl.utils.Template.replace(this.paletteColorTemplate_, {
          color : color,
          index : index + 1,
          title : color.toUpperCase()
        });
      }.bind(this)).join('');
      this.colorListContainer_.innerHTML = html;

      this.highlightSelectedColors();
    } else {
      this.colorListContainer_.innerHTML = pskl.utils.Template.get('palettes-list-no-colors-partial');
    }

    // If we have more than 10 colors, use tiny mode, where 10 colors will fit on the same
    // line.
    this.colorListContainer_.classList.toggle('tiny', colors.length > 10);
  };

  ns.PalettesListController.prototype.selectPalette = function (paletteId) {
    pskl.UserSettings.set(pskl.UserSettings.SELECTED_PALETTE, paletteId);
  };

  ns.PalettesListController.prototype.getSelectedPaletteColors_ = function () {
    var colors = [];
    var palette = this.getSelectedPalette_();
    if (palette) {
      colors = palette.getColors();
    }

    if (colors.length > Constants.MAX_PALETTE_COLORS) {
      colors = colors.slice(0, Constants.MAX_PALETTE_COLORS);
    }

    return colors;
  };

  ns.PalettesListController.prototype.getSelectedPalette_ = function () {
    var paletteId = pskl.UserSettings.get(pskl.UserSettings.SELECTED_PALETTE);
    return this.paletteService.getPaletteById(paletteId);
  };

  ns.PalettesListController.prototype.selectNextColor_ = function () {
    this.selectColor_(this.getCurrentColorIndex_() + 1);
  };

  ns.PalettesListController.prototype.selectPreviousColor_ = function () {
    this.selectColor_(this.getCurrentColorIndex_() - 1);
  };

  ns.PalettesListController.prototype.getCurrentColorIndex_ = function () {
    var currentIndex = 0;
    var selectedColor = document.querySelector('.' + PRIMARY_COLOR_CLASSNAME);
    if (selectedColor) {
      currentIndex = parseInt(selectedColor.dataset.colorIndex, 10) - 1;
    }
    return currentIndex;
  };

  ns.PalettesListController.prototype.selectColorForKey_ = function (key) {
    var index = parseInt(key, 10);
    index = (index + 9) % 10;
    this.selectColor_(index);
  };

  ns.PalettesListController.prototype.selectColor_ = function (index) {
    var colors = this.getSelectedPaletteColors_();
    var color = colors[index];
    if (color) {
      $.publish(Events.SELECT_PRIMARY_COLOR, [color]);
    }
  };

  ns.PalettesListController.prototype.onUserSettingsChange_ = function (evt, name, value) {
    if (name == pskl.UserSettings.SELECTED_PALETTE) {
      this.updateFromUserSettings();
    }
  };

  ns.PalettesListController.prototype.updateFromUserSettings = function () {
    var paletteId = pskl.UserSettings.get(pskl.UserSettings.SELECTED_PALETTE);
    this.fillColorListContainer();
    this.colorPaletteSelect_.value = paletteId;
  };

  ns.PalettesListController.prototype.onPaletteSelected_ = function (evt) {
    var paletteId = this.colorPaletteSelect_.value;
    this.selectPalette(paletteId);
    this.colorPaletteSelect_.blur();
  };

  ns.PalettesListController.prototype.onCreatePaletteClick_ = function (evt) {
    $.publish(Events.DIALOG_SHOW, {
      dialogId : 'create-palette'
    });
  };

  ns.PalettesListController.prototype.onEditPaletteClick_ = function (evt) {
    var paletteId = this.colorPaletteSelect_.value;
    $.publish(Events.DIALOG_SHOW, {
      dialogId : 'create-palette',
      initArgs : paletteId
    });
  };

  ns.PalettesListController.prototype.onColorContainerContextMenu = function (event) {
    event.preventDefault();
  };

  ns.PalettesListController.prototype.onColorContainerMouseup = function (event) {
    var target = event.target;
    var color = target.dataset.color;

    if (color) {
      if (event.button == Constants.LEFT_BUTTON) {
        $.publish(Events.SELECT_PRIMARY_COLOR, [color]);
      } else if (event.button == Constants.RIGHT_BUTTON) {
        $.publish(Events.SELECT_SECONDARY_COLOR, [color]);
      }
    }
  };

  ns.PalettesListController.prototype.highlightSelectedColors = function () {
    this.removeClass_(PRIMARY_COLOR_CLASSNAME);
    this.removeClass_(SECONDARY_COLOR_CLASSNAME);

    var colorContainer = this.getColorContainer_(pskl.app.selectedColorsService.getSecondaryColor());
    if (colorContainer) {
      colorContainer.classList.remove(PRIMARY_COLOR_CLASSNAME);
      colorContainer.classList.add(SECONDARY_COLOR_CLASSNAME);
    }

    colorContainer = this.getColorContainer_(pskl.app.selectedColorsService.getPrimaryColor());
    if (colorContainer) {
      colorContainer.classList.remove(SECONDARY_COLOR_CLASSNAME);
      colorContainer.classList.add(PRIMARY_COLOR_CLASSNAME);
    }
  };

  ns.PalettesListController.prototype.getColorContainer_ = function (color) {
    return this.colorListContainer_.querySelector('.palettes-list-color[data-color="' + color + '"]');
  };

  ns.PalettesListController.prototype.removeClass_ = function (cssClass) {
    var element = document.querySelector('.' + cssClass);
    if (element) {
      element.classList.remove(cssClass);
    }
  };

  ns.PalettesListController.prototype.onPaletteListUpdated = function () {
    this.fillPaletteList();
    this.updateFromUserSettings();
  };
})();
