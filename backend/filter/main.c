#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "cJSON.h"

int main() {
    FILE *file = fopen("courses.json", "r");
    if (file == NULL) {
        printf("Failed to open the JSON file.\n");
        return 1;
    }

    fseek(file, 0, SEEK_END);
    long file_size = ftell(file);
    rewind(file);

    char *json_data = (char *)malloc(file_size + 1);
    fread(json_data, 1, file_size, file);
    json_data[file_size] = '\0';

    fclose(file);

    cJSON *root = cJSON_Parse(json_data);
    if (root == NULL) {
        printf("Failed to parse the JSON data.\n");
        free(json_data);
        return 1;
    }

    int num_courses = cJSON_GetArraySize(root);

    for (int i = 0; i < num_courses; i++) {
        cJSON *course = cJSON_GetArrayItem(root, i);
        cJSON *slots = cJSON_GetObjectItem(course, "SLOTS");

        int num_slots = cJSON_GetArraySize(slots);

        for (int j = 0; j < num_slots; j++) {
            cJSON *slot = cJSON_GetArrayItem(slots, j);
            cJSON *slot_id = cJSON_CreateNumber(j + 1);
            cJSON_AddItemToObject(slot, "slotId", slot_id);
        }
    }

    char *updated_json = cJSON_Print(root);

    FILE *output_file = fopen("updated_courses.json", "w");
    if (output_file == NULL) {
        printf("Failed to create the output file.\n");
        free(json_data);
        cJSON_Delete(root);
        return 1;
    }

    fprintf(output_file, "%s", updated_json);
    fclose(output_file);

    free(json_data);
    cJSON_Delete(root);

    printf("JSON file updated successfully. Output saved to 'updated_courses.json'.\n");

    return 0;
}