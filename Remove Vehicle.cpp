bool remove(string number) {
        Node* temp = head;
        Node* prev = NULL;
        while (temp != NULL) {
            if (temp->v.number == number) {
                if (prev == NULL)
                    head = temp->next;
                else
                    prev->next = temp->next;
                delete temp;
                return true;
            }
            prev = temp;
            temp = temp->next;
        }
        return false;
    }
