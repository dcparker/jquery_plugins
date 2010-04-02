$(function(){
  // Perform the helper-text in the input fields
  $('input[type=text]').each(function(){
    if(String($(this).attr('title')).length>0 && $(this).val()===''){
      $(this).data('prompt', $(this).attr('title'));
      $(this).attr('title', '');
      $(this).val($(this).data('prompt'));
      $(this).addClass('blur');
    }
  });
  
  $('input[type=text]').focus(function(){
    if($(this).val()==$(this).data('prompt')) $(this).val('');
    $(this).removeClass('blur');
  });
  
  $('input[type=text]').blur(function(){
    var self=this;
    setTimeout(function(){
      if($(self).val().length===0){
        $(self).val($(self).data('prompt'));
        $(self).addClass('blur');
      }
    }, 300);
  });
});
