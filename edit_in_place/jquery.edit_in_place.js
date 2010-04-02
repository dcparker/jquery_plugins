/*
  Creates an edit box to replace any element, along with a callback
  function to handle the return value. Call this in real time, not
  on page load: for example, call it from the onclick of a link or
  dbclick of a paragraph:
    $('#editable-thing').bind('click', function(){
      $(this).edit_in_place(function(value){
        // 'this' is the editable element
        alert("You typed "+value);
      });
    });

  How it works:
    Hides the original element and adds an edit box next to it, the same size.
    After editing, shows the original object again and removes the edit box.

  !! NOTE !! It is up to the callback to change the original object if necessary.
*/

$.fn.edit_in_place = function(init_value_or_options, callback){
  var init_value=init_value_or_options, options={};
  if(init_value_or_options.constructor!=String){
    options = init_value_or_options;
    init_value = options.init_value;
  }
  var $element = this;
  if(!options.input_type) options.input_type = $element.attr('data-input-type') || 'text';
  if($element.length>1){console.error("Call $().edit_in_place only on a singular jquery object.");}
  var $edit = (options.input_type == 'textarea' ? $('<span class="edit_in_place"><textarea id="inline_editing" /><button>save</button> <button>cancel</button></span>') : $('<input id="inline_editing" type="text" class="edit_in_place" />'));
  var font_size = parseFloat($element.css('font-size').match(/([\d\.]+)/)[1]);
  var font_weight = $element.css('font-weight');
  var font_style = $element.css('font-style');
  var font_family = $element.css('font_family');
  var font_unit = $element.css('font-size').match(/\d+(.+)/)[1];
  $edit.css({'height' : $element.height()-3, 'width' : $element.width()+1, 'font-size' : ''+((font_size-2)*3/4+2)+font_unit, 'font-weight' : font_weight, 'font-style' : font_style, 'font-family' : font_family});
  $element.hide();
  $element.after($edit);
  var $field = $('#inline_editing');
  if(init_value)$field.val($element.text());
  $('#inline_editing').focus();
  var save = function(){
    $edit.hide();
    $element.show();
    if($field.val()!=='') callback.apply($element, [$field.val()]);
    $edit.remove();
  };
  var cancel = function(){
    $edit.remove();
    $element.show();
  };
  if(options.input_type == 'textarea'){
    $edit.find('button:first').bind('click', save);
    $edit.find('button:last').bind('click', cancel);
  }else{
    $field.bind('blur', cancel).keydown(function(e){ // on blur, forget edits and reset.
      if(e.which===27)$edit.blur(); // blur on Esc: see above
      if(e.which===13 || e.which===9){ // Enter or Tab: run the callback with the value
        e.preventDefault();
        save();
      }
    });
  }
};
