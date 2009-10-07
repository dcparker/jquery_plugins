/*
  Creates an edit box to replace any element, along with a callback
  function to handle the return value. Call this in real time, not
  on page load: for example, call it from the onclick of a link or
  dbclick of a paragraph:
    $('#editable-thing').bind('click', function(){
      $(this).edit_in_place(function(editable_thing, value){alert("You typed "+value)});
    });

  How it works:
    Hides the original element and adds an edit box next to it, the same size.
    After editing, shows the original object again and removes the edit box.

  !! NOTE !! It is up to the callback to change the original object if necessary.
*/

$.fn.edit_in_place = function(callback){
  var $element = this;
  if($element.length>1){console.error("Call $().edit_in_place only on a singular jquery object.");return null;}
  var $edit = $('<input type="text" class="edit_in_place" />');
  $edit.css({'height' : $element.height()-2, 'width' : $element.width()-2}); // don't know why 2, but it seems to work. Tweak this css stuff if you want, or add a class instead and style that.
  $element.hide();
  $element.after($edit);
  $edit.focus();
  $edit.select();
  $edit.bind('blur', function(){ // on blur, forget edits, forget input box, revert everything.
    $edit.remove();
    $element.show();
  });
  $edit.keydown(function(e){
    if(e.which===27)$edit.blur(); // Esc: just blur - see above
    if(e.which===13 || e.which===9){ // Enter or Tab: reverts stuff and runs your callback with the value.
      e.preventDefault();
      var value = $edit.val();
      $edit.remove();
      $element.show();
      if(value!=='') callback.apply($element, [value]);
    }
  });
};