class Queue {
public:
    Vehicle q[QSIZE];
    int count;

    Queue() {
        count = 0;
    }

    void enqueue(Vehicle v) {
        if (count == QSIZE) {
            cout << "Waiting queue is full!\n";
            return;
        }
        q[count] = v;
        count++;
    }
