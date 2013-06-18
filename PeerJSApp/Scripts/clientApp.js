﻿// Connect to PeerJS, have server assign an ID instead of providing one
var peer = new Peer({ host: 'localhost', port: 9000 });

// Show this peer's ID.
peer.on('open', function(id){
    $('#pid').text(id);
});

// Await connections from others
peer.on('connection', connect);

// Handle a connection object.
function connect(c) {
    // Handle a chat connection.
    if (c.label === 'chat') {
        var chatbox = $('<div></div>').addClass('connection').addClass('active').attr('id', c.peer);
        var header = $('<h1></h1>').html('Chat with <strong>' + c.peer + '</strong>');
        var messages = $('<div><em>Peer connected.</em></div>').addClass('messages');
        chatbox.append(header);
        chatbox.append(messages);
 
        // Select connection handler.
        chatbox.on('click', function() {
            if ($(this).attr('class').indexOf('active') === -1) {
                $(this).addClass('active');
            } else {
                $(this).removeClass('active');
            }
        });
        $('.filler').hide();
        $('#connections').append(chatbox);

        c.on('data', function(data) {
            messages.append('<div><span class="peer">' + c.peer + '</span>: ' + data +
              '</div>');
        });
        c.on('close', function() {
            alert(c.peer + ' has left the chat.');
            chatbox.remove();
            if ($('.connection').length === 0) {
                $('.filler').show();
            }
        });
    } else if (c.label === 'file') {
        c.on('data', function(data) {
            // If we're getting a file, create a URL for it.
            if (data.constructor === ArrayBuffer) {
                var dataView = new Uint8Array(data);
                var dataBlob = new Blob([dataView]);
                var url = window.URL.createObjectURL(dataBlob);
                $('#' + c.peer).find('.messages').append('<div><span class="file">' +
                    c.peer + ' has sent you a <a target="_blank" href="' + url + '">file</a>.</span></div>');
            }
        });
    }
}

$(document).ready(function() {
    // Prepare file drop box.
    var box = $('#box');
    box.on('dragenter', doNothing);
    box.on('dragover', doNothing);
    box.on('drop', function(e){
        e.originalEvent.preventDefault();
        var file = e.originalEvent.dataTransfer.files[0];
        eachActiveConnection(function(c, $c) {
            if (c.label === 'file') {
                c.send(file);
                $c.find('.messages').append('<div><span class="file">You sent a file.</span></div>');
            }
        });
    });
    function doNothing(e){
        e.preventDefault();
        e.stopPropagation();
    }

    // Connect to a peer
    $('#connect').click(function() {
        // Create 2 connections, one labelled chat and another labelled file.
        var c = peer.connect($('#rid').val(), { label: 'chat' });
        c.on('open', function() {
            connect(c);
        });
        c.on('error', function(err) { alert(err); });
        var f = peer.connect($('#rid').val(), { reliable: true, label: 'file' });
        f.on('open', function() {
            connect(f);
        });
        f.on('error', function(err) { alert(err); });
    });

    // Close a connection.
    $('#close').click(function() {
        eachActiveConnection(function(c) {
            c.close();
        });
    });

    // Send a chat message to all active connections.
    $('#send').submit(function(e) {
        e.preventDefault();
        // For each active connection, send the message.
        var msg = $('#text').val();
        eachActiveConnection(function(c, $c) {
            if (c.label === 'chat') {
                c.send(msg);
                $c.find('.messages').append('<div><span class="you">You: </span>' + msg
                  + '</div>');
            }
        });
        $('#text').val('');
        $('#text').focus();
    });

    // Goes through each active peer and calls FN on its connections.
    function eachActiveConnection(fn) {
        var actives = $('.active');
        actives.each(function() {
            var peerId = $(this).attr('id');
            var conns = peer.connections[peerId];
            var labels = Object.keys(conns);
            for (var i = 0, ii = labels.length; i < ii; i += 1) {
                var conn = conns[labels[i]];
                fn(conn, $(this));
            }
        });
    }

    // Show browser version
    $('#browsers').text(navigator.userAgent);
});

// Make sure things clean up properly.

window.onunload = window.onbeforeunload = function(e) {
    if (!!peer && !peer.destroyed) {
        peer.destroy();
    }
};
