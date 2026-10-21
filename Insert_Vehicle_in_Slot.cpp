struct Node {
    Vehicle v;
    Node* next;
};
class LinkedList {
public:
    Node* head;
    LinkedList() {
        head = NULL;
    }
    void insert(Vehicle v) {
        Node* temp = new Node;
        temp->v = v;
        temp->next = head;
        head = temp;
    }
