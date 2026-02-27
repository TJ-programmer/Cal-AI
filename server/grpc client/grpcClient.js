const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');


const PROTO_PATH = path.join(__dirname, 'chat.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
});

const chatProto = grpc.loadPackageDefinition(packageDefinition).chat;

class GrpcChatClient {
    constructor(serverAddress = 'localhost:50051') {
        this.serverAddress = serverAddress;
        this.client = new chatProto.ChatService(
            serverAddress,
            grpc.credentials.createInsecure()
        );
        this.isConnected = false;
        this.connectionCheckInterval = null;
        
        
        this.startConnectionMonitoring();
    }
  

    


    startConnectionMonitoring() {
        
        this.connectionCheckInterval = setInterval(() => {
            this.checkConnection();
        }, 5000);
    }

    async checkConnection() {
        try {
            // Get the current channel state
            const state = this.client.getChannel().getConnectivityState(true);
            // Consider READY, IDLE, or CONNECTING as connected
            this.isConnected = (
                state === grpc.connectivityState.READY ||
                state === grpc.connectivityState.IDLE ||
                state === grpc.connectivityState.CONNECTING
            );
            if (this.isConnected) {
                console.log(`gRPC server at ${this.serverAddress} is ready (state: ${state})`);
            } else {
                console.warn(`gRPC server at ${this.serverAddress} is not ready. State: ${state}`);
            }
        } catch (error) {
            console.warn(`gRPC server at ${this.serverAddress} is not ready: ${error.message}`);
            this.isConnected = false;
        }
    }
    streamChatWithContext(userId, sessionId, conversationContext, onData, onEnd, onError) {
        const request = {
            user_id: userId,
            session_id: sessionId,
            conversation_history: conversationContext.map(msg => ({
                role: msg.role,
                content: msg.content,
                timestamp: msg.timestamp ? new Date(msg.timestamp).getTime() : Date.now()
            }))
        };

        console.log(`Starting gRPC stream with ${conversationContext.length} context messages`);
        
        const call = this.client.streamChat(request);
        
        call.on('data', onData);
        call.on('end', onEnd);
        call.on('error', onError);
        
        return call;
    }

    
    streamChat(userId, sessionId, message, onData, onEnd, onError) {
        const request = {
            user_id: userId,
            session_id: sessionId,
            message: message,
            timestamp: Date.now()
        };

        console.log('Sending gRPC request:', request);
        console.log('Current connection status:', this.isConnected);

        const call = this.client.StreamChat(request);

        
        call.on('data', (response) => {
            console.log('Received streaming response:', response);
            if (typeof onData === 'function') {
                onData(response);
            } else {
                console.error('No onData handler provided for gRPC stream:', response);
            }
        });

        
        call.on('end', () => {
            console.log('gRPC stream ended');
            if (typeof onEnd === 'function') {
                onEnd();
            } else {
                console.error('No onEnd handler provided for gRPC stream end.');
            }
        });

        
        call.on('error', (error) => {
            console.error('gRPC stream error:', error);
            
            
            let errorMessage = 'An error occurred while processing your request.';
            
            if (error.code === grpc.status.UNAVAILABLE) {
                errorMessage = `The AI service is currently unavailable. Please ensure the Python gRPC server is running at ${this.serverAddress}.`;
            } else if (error.code === grpc.status.DEADLINE_EXCEEDED) {
                errorMessage = 'The request timed out. Please try again.';
            } else if (error.code === grpc.status.INTERNAL) {
                errorMessage = 'An internal error occurred in the AI service.';
            }
            
            const enhancedError = new Error(errorMessage);
            enhancedError.code = error.code;
            enhancedError.originalError = error;
            
            if (typeof onError === 'function') {
                onError(enhancedError);
            } else {
                console.error('No onError handler provided for gRPC stream:', enhancedError);
            }
        });

        
        call.on('status', (status) => {
            console.log('gRPC stream status:', status);
        });

        return call;
    }

    
    getConnectionStatus() {
        return {
            isConnected: this.isConnected,
            serverAddress: this.serverAddress
        };
    }

    
    close() {
        if (this.connectionCheckInterval) {
            clearInterval(this.connectionCheckInterval);
        }
        this.client.close();
    }
}

module.exports = GrpcChatClient;