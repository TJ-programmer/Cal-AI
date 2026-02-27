// GENERATED CODE -- DO NOT EDIT!

'use strict';
var grpc = require('@grpc/grpc-js');
var chat_pb = require('./chat_pb.js');

function serialize_chat_ChatResponse(arg) {
  if (!(arg instanceof chat_pb.ChatResponse)) {
    throw new Error('Expected argument of type chat.ChatResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_chat_ChatResponse(buffer_arg) {
  return chat_pb.ChatResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_chat_ChatStreamRequest(arg) {
  if (!(arg instanceof chat_pb.ChatStreamRequest)) {
    throw new Error('Expected argument of type chat.ChatStreamRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_chat_ChatStreamRequest(buffer_arg) {
  return chat_pb.ChatStreamRequest.deserializeBinary(new Uint8Array(buffer_arg));
}


var ChatServiceService = exports.ChatServiceService = {
  streamChat: {
    path: '/chat.ChatService/StreamChat',
    requestStream: false,
    responseStream: true,
    requestType: chat_pb.ChatStreamRequest,
    responseType: chat_pb.ChatResponse,
    requestSerialize: serialize_chat_ChatStreamRequest,
    requestDeserialize: deserialize_chat_ChatStreamRequest,
    responseSerialize: serialize_chat_ChatResponse,
    responseDeserialize: deserialize_chat_ChatResponse,
  },
};

exports.ChatServiceClient = grpc.makeGenericClientConstructor(ChatServiceService, 'ChatService');
