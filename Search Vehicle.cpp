Node* search(string number) {
        Node* temp = head;
        while (temp != NULL) {
            if (temp->v.number == number)
                return temp;
            temp = temp->next;
        }
        return NULL;
    }
