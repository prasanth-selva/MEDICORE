const setupSocket = (io) => {
    io.on('connection', (socket) => {
        console.log(`🔌 Client connected: ${socket.id}`);

        // Join room based on role
        socket.on('JOIN_ROOM', (room) => {
            socket.join(room);
            console.log(`${socket.id} joined room: ${room}`);
        });

        // Doctor status change
        socket.on('DOCTOR_STATUS_CHANGED', (data) => {
            io.to('patients').to('admin').to('pharmacy').to('reception').emit('DOCTOR_STATUS_CHANGED', data);
        });

        // Prescription sent from doctor to pharmacy
        socket.on('PRESCRIPTION_SENT', (data) => {
            io.to('pharmacy').emit('PRESCRIPTION_SENT', data);
            io.to('admin').emit('PRESCRIPTION_SENT', data);
        });

        // Pharmacy confirms receipt
        socket.on('PRESCRIPTION_RECEIVED', (data) => {
            io.to('doctors').emit('PRESCRIPTION_RECEIVED', data);
        });

        // Prescription dispensed
        socket.on('PRESCRIPTION_DISPENSED', (data) => {
            io.to('patients').emit('PRESCRIPTION_DISPENSED', data);
            io.to('admin').emit('PRESCRIPTION_DISPENSED', data);
        });

        // SOS Emergency alert
        socket.on('SOS_ALERT', (data) => {
            io.to('doctors').to('pharmacy').to('admin').to('reception').emit('SOS_ALERT', data);
        });

        // SOS Acknowledged
        socket.on('SOS_ACKNOWLEDGED', (data) => {
            io.to('patients').emit('SOS_ACKNOWLEDGED', data);
        });

        // Queue updated
        socket.on('QUEUE_UPDATED', (data) => {
            io.to('admin').to('patients').to('doctors').to('reception').emit('QUEUE_UPDATED', data);
        });

        // Notification
        socket.on('NOTIFICATION', (data) => {
            if (data.userId) {
                io.to(`user_${data.userId}`).emit('NOTIFICATION', data);
            }
        });

        socket.on('disconnect', () => {
            console.log(`❌ Client disconnected: ${socket.id}`);
        });

        // Doctor calls next patient — notify reception
        socket.on('CALL_NEXT_PATIENT', (data) => {
            io.to('reception').to('admin').emit('CALL_NEXT_PATIENT', data);
        });

        // Reception checks in patient — notify doctor
        socket.on('PATIENT_CHECKED_IN', (data) => {
            io.to('doctors').to('admin').emit('PATIENT_CHECKED_IN', data);
        });

        // Reception marks patient ready for doctor
        socket.on('PATIENT_READY', (data) => {
            io.to('doctors').to('admin').emit('PATIENT_READY', data);
        });

        // Doctor signals consultation complete
        socket.on('CONSULTATION_COMPLETE', (data) => {
            io.to('reception').to('admin').to('patients').emit('CONSULTATION_COMPLETE', data);
        });
    });
};

module.exports = setupSocket;

