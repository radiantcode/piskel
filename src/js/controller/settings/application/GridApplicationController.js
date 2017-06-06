(function () {
  var ns = $.namespace('pskl.controller.settings.application');

  var colorsMap = {
    'transparent': Constants.TRANSPARENT_COLOR,
    'white': '#FFF1E8',
    'light-gray': '#C2C3C7',
    'dark-gray': '#5F574F',
    'black': '#000000',
    'blue': '#29ADFF',
    'dark-blue': '#1D2B53',
    'green': '#00E436',
    'dark-green': '#008751',
    'peach': '#FFCCAA',
    'pink': '#FF77A8',
    'yellow': '#FFEC27',
    'orange': '#FFA300',
    'red': '#FF004D',
  };

  ns.GridApplicationController = function (piskelController, applicationController) {
    this.piskelController = piskelController;
    this.applicationController = applicationController;
    this.sizePicker = new pskl.widgets.SizePicker(this.onSizePickerChanged_.bind(this));
  };

  pskl.utils.inherit(ns.GridApplicationController, pskl.controller.settings.AbstractSettingController);

  ns.GridApplicationController.prototype.init = function () {
    // Grid enabled
    var isEnabled = pskl.UserSettings.get(pskl.UserSettings.GRID_ENABLED);
    var enableGridCheckbox = document.querySelector('.enable-grid-checkbox');
    if (isEnabled) {
      enableGridCheckbox.setAttribute('checked', 'true');
    }
    this.addEventListener(enableGridCheckbox, 'change', this.onEnableGridChange_);

    // Grid size
    var gridWidth = pskl.UserSettings.get(pskl.UserSettings.GRID_WIDTH);
    this.sizePicker.init(document.querySelector('.grid-size-container'));
    this.sizePicker.setSize(gridWidth);

    // Grid color
    var colorListItemTemplate = pskl.utils.Template.get('color-list-item-template');

    var gridColor = pskl.UserSettings.get(pskl.UserSettings.GRID_COLOR);
    var gridColorSelect = document.querySelector('#grid-color');

    var markup = '';
    Object.keys(colorsMap).forEach(function (key, index) {
      var background = colorsMap[key];
      if (key === 'transparent') {
        background = 'url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAMCAIAAADZ' +
            'F8uwAAAAGUlEQVQYV2M4gwH+YwCGIasIUwhT25BVBADtzYNYrHvv4gAAAABJRU5ErkJggg==)';
      }
      markup += pskl.utils.Template.replace(colorListItemTemplate, {
        color: colorsMap[key],
        index: index,
        title: key,
        background: background,
        ':selected': gridColor === colorsMap[key]
      });
    });
    this.gridColorList = document.querySelector('.grid-colors-list');
    this.gridColorList.innerHTML = markup;

    this.addEventListener(this.gridColorList, 'click', this.onGridColorClicked_.bind(this));
  };

  ns.GridApplicationController.prototype.destroy = function () {
    this.sizePicker.destroy();
    this.superclass.destroy.call(this);
  };

  ns.GridApplicationController.prototype.onSizePickerChanged_ = function (size) {
    pskl.UserSettings.set(pskl.UserSettings.GRID_WIDTH, size);
  };

  ns.GridApplicationController.prototype.onEnableGridChange_ = function (evt) {
    pskl.UserSettings.set(pskl.UserSettings.GRID_ENABLED, evt.currentTarget.checked);
  };

  ns.GridApplicationController.prototype.onGridColorClicked_ = function (evt) {
    var color = evt.target.dataset.color;
    if (color) {
      pskl.UserSettings.set(pskl.UserSettings.GRID_COLOR, color);
      this.gridColorList.querySelector('.selected').classList.remove('selected');
      evt.target.classList.add('selected');
    }
  };
})();
