
// Park a vehicle in a slot
void parkVehicle(Vehicle v, int slot) {
    v.slot = slot;
    occupied[slot] = true;
    parked.insert(v);

    cout << v.number << " parked in slot "
         << slot + 1 << endl;
}

// Vehicle entry
void vehicleEntry() {
    Vehicle v;

    cout << "Vehicle number: ";
    cin >> v.number;

    if (parked.search(v.number) != NULL) {
        cout << "Vehicle already parked!\n";
        return;
    }

    for (int i = 0; i < waiting.count; i++) {
        if (waiting.q[i].number == v.number) {
            cout << "Vehicle already waiting!\n";
            return;
        }
    }

    cout << "Owner name: ";
    cin >> v.owner;

    cout << "1. Bike  2. Car  3. SUV\n";
    cout << "Enter type: ";
    cin >> v.type;

    if (v.type < 1 || v.type > 3) {
        cout << "Invalid vehicle type!\n";
        return;
    }

    v.type--;
    v.entry = getTime();
    v.slot = -1;

    int slot = freeSlot();

    if (slot != -1) {
        parkVehicle(v, slot);
    } else if (waiting.count < QSIZE) {
        waiting.enqueue(v);
        cout << "Parking full. Added to waiting queue.\n";
    } else {
        cout << "Parking and queue both full!\n";
    }
}

// Vehicle exit and fee calculation
void vehicleExit() {
    string number;

    cout << "Vehicle number: ";
    cin >> number;

    Node* node = parked.search(number);

    if (node == NULL) {
        cout << "Vehicle not found in parking.\n";
        return;
    }

    Vehicle v = node->v;
    int exitTime = getTime();

    int duration = exitTime - v.entry;

    if (duration < 0)
        duration += 1440;

    int hours = (duration + 59) / 60;

    if (hours < 1)
        hours = 1;

    int fee = hours * rate[v.type];

    cout << "\n------ PARKING BILL ------\n";
    cout << "Vehicle: " << v.number << endl;
    cout << "Type: " << typeName[v.type] << endl;
    cout << "Duration: " << duration << " minutes\n";
    cout << "Parking fee: Rs. " << fee << endl;

    if (historyCount < MAX) {
        history[historyCount].number = v.number;
        history[historyCount].fee = fee;
        history[historyCount].duration = duration;
        historyCount++;
    }

    int slot = v.slot;

    parked.remove(number);
    occupied[slot] = false;

    cout << "Vehicle exited successfully.\n";

    // Give the free slot to the first waiting vehicle
    if (waiting.count > 0) {
        Vehicle next = waiting.dequeue();
        next.entry = exitTime;
        parkVehicle(next, slot);
    }
}

// Display all parking slots
void showSlots() {
    for (int i = 0; i < SLOTS; i++) {
        cout << "Slot " << i + 1 << ": ";

        if (occupied[i])
            cout << "Occupied\n";
        else
            cout << "Free\n";
    }
}

// Search for a parked vehicle
void searchVehicle() {
    string number;

    cout << "Enter vehicle number: ";
    cin >> number;

    Node* temp = parked.search(number);

    if (temp != NULL) {
        cout << "Vehicle found in slot "
             << temp->v.slot + 1 << endl;
    } else {
        cout << "Vehicle not found among parked vehicles.\n";
    }
}

// Display parking history
void showHistory() {
    for (int i = 0; i < historyCount; i++) {
        cout << history[i].number
             << " | Fee: Rs. " << history[i].fee
             << " | Duration: " << history[i].duration
             << " minutes\n";
    }

    if (historyCount == 0)
        cout << "No parking history.\n";
}

// Bubble sort history by fee
void sortHistory() {
    for (int i = 0; i < historyCount - 1; i++) {
        for (int j = 0; j < historyCount - i - 1; j++) {
            if (history[j].fee > history[j + 1].fee) {
                History temp = history[j];
                history[j] = history[j + 1];
                history[j + 1] = temp;
            }
        }
    }

    cout << "History sorted by fee (ascending).\n";
    showHistory();
}
