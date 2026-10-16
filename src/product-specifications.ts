// Full original website specification tables. Cell text and merged spans are preserved.
export interface SpecificationCell {text:string;rowspan:string;colspan:string}
export const productSpecificationTables:Record<string,SpecificationCell[][]>={
  "scroll-chiller": [
    [
      {
        "text": "MODEL",
        "rowspan": "1",
        "colspan": "3"
      },
      {
        "text": "UNIT",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "SG-03AR",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "SG-05AR",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "SG-7.5AR",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "SG-10AR",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "SG-15AR",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "SG-20AR",
        "rowspan": "1",
        "colspan": "1"
      }
    ],
    [
      {
        "text": "냉동능력",
        "rowspan": "1",
        "colspan": "3"
      },
      {
        "text": "kcal/h",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "8,800",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "14,100",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "19,300",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "29,500",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "38,300",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "43,600",
        "rowspan": "1",
        "colspan": "1"
      }
    ],
    [
      {
        "text": "압축기",
        "rowspan": "4",
        "colspan": "1"
      },
      {
        "text": "형식",
        "rowspan": "1",
        "colspan": "2"
      },
      {
        "text": "",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "Hermetic Scroll",
        "rowspan": "1",
        "colspan": "6"
      }
    ],
    [
      {
        "text": "정격출력",
        "rowspan": "1",
        "colspan": "2"
      },
      {
        "text": "kW(HP)",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "2.25(3)",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "3.75(5)",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "5.5(7.5)",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "7.5(10)",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "11.2(15)",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "15(20)",
        "rowspan": "1",
        "colspan": "1"
      }
    ],
    [
      {
        "text": "기동방식",
        "rowspan": "1",
        "colspan": "2"
      },
      {
        "text": "",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "직입기동",
        "rowspan": "1",
        "colspan": "6"
      }
    ],
    [
      {
        "text": "용량제어",
        "rowspan": "1",
        "colspan": "2"
      },
      {
        "text": "%",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "0,100",
        "rowspan": "1",
        "colspan": "6"
      }
    ],
    [
      {
        "text": "응축기",
        "rowspan": "4",
        "colspan": "1"
      },
      {
        "text": "형식",
        "rowspan": "1",
        "colspan": "2"
      },
      {
        "text": "",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "Fin & Tube Type",
        "rowspan": "1",
        "colspan": "6"
      }
    ],
    [
      {
        "text": "송풍기",
        "rowspan": "1",
        "colspan": "2"
      },
      {
        "text": "",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "직결구동 프로펠러 송풍기",
        "rowspan": "1",
        "colspan": "6"
      }
    ],
    [
      {
        "text": "외기온도",
        "rowspan": "1",
        "colspan": "2"
      },
      {
        "text": "℃",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "35",
        "rowspan": "1",
        "colspan": "6"
      }
    ],
    [
      {
        "text": "송풍기모터",
        "rowspan": "1",
        "colspan": "2"
      },
      {
        "text": "Kw",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "0.1kWx6Px2EA",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "0.1kWx6Px2EA",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "0.2kWx6Px2EA",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "0.2kWx6Px2EA",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "0.4kWx6Px2EA",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "0.4kWx6Px2EA",
        "rowspan": "1",
        "colspan": "1"
      }
    ],
    [
      {
        "text": "증발기",
        "rowspan": "3",
        "colspan": "1"
      },
      {
        "text": "형식",
        "rowspan": "1",
        "colspan": "2"
      },
      {
        "text": "",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "Shell & Tube Type",
        "rowspan": "1",
        "colspan": "6"
      }
    ],
    [
      {
        "text": "냉수 입/출구온도",
        "rowspan": "1",
        "colspan": "2"
      },
      {
        "text": "℃",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "12/7",
        "rowspan": "1",
        "colspan": "6"
      }
    ],
    [
      {
        "text": "냉수량",
        "rowspan": "1",
        "colspan": "2"
      },
      {
        "text": "㎡/h",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "1.7",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "2.8",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "3.8",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "5.9",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "7.6",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "8.7",
        "rowspan": "1",
        "colspan": "1"
      }
    ],
    [
      {
        "text": "냉매",
        "rowspan": "2",
        "colspan": "1"
      },
      {
        "text": "종류",
        "rowspan": "1",
        "colspan": "2"
      },
      {
        "text": "",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "R-22",
        "rowspan": "1",
        "colspan": "6"
      }
    ],
    [
      {
        "text": "제어방식",
        "rowspan": "1",
        "colspan": "2"
      },
      {
        "text": "",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "감온식 팽창밸브",
        "rowspan": "1",
        "colspan": "6"
      }
    ],
    [
      {
        "text": "전원",
        "rowspan": "2",
        "colspan": "1"
      },
      {
        "text": "주전원",
        "rowspan": "1",
        "colspan": "2"
      },
      {
        "text": "",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "AC / 3ph / 220V, 380V, 440V / 60Hz",
        "rowspan": "1",
        "colspan": "6"
      }
    ],
    [
      {
        "text": "조작전원",
        "rowspan": "1",
        "colspan": "2"
      },
      {
        "text": "",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "AC / 1ph / 220V / 60Hz",
        "rowspan": "1",
        "colspan": "6"
      }
    ],
    [
      {
        "text": "Oil Heater",
        "rowspan": "1",
        "colspan": "3"
      },
      {
        "text": "W",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "70",
        "rowspan": "1",
        "colspan": "6"
      }
    ],
    [
      {
        "text": "보호장치",
        "rowspan": "1",
        "colspan": "3"
      },
      {
        "text": "",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "고, 저압 압력 스위치, 가용전, 과전류계전기, 동결방지용 온도조절기, 역상방지기 (Scroll 적용)",
        "rowspan": "1",
        "colspan": "6"
      }
    ],
    [
      {
        "text": "작동치",
        "rowspan": "4",
        "colspan": "1"
      },
      {
        "text": "스위치",
        "rowspan": "2",
        "colspan": "1"
      },
      {
        "text": "고압",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "MPa",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "2.4, MANUAL RESET",
        "rowspan": "1",
        "colspan": "6"
      }
    ],
    [
      {
        "text": "저압",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "MPa",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "0.2 / 0.35, AUTO RESET",
        "rowspan": "1",
        "colspan": "6"
      }
    ],
    [
      {
        "text": "가용전",
        "rowspan": "1",
        "colspan": "2"
      },
      {
        "text": "℃",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "72±2",
        "rowspan": "1",
        "colspan": "6"
      }
    ],
    [
      {
        "text": "동결방지기",
        "rowspan": "1",
        "colspan": "2"
      },
      {
        "text": "℃",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "4, MANUAL RESET",
        "rowspan": "1",
        "colspan": "6"
      }
    ],
    [
      {
        "text": "증발기 접속 관경",
        "rowspan": "1",
        "colspan": "3"
      },
      {
        "text": "A",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "32",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "32",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "40",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "40",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "50",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "50",
        "rowspan": "1",
        "colspan": "1"
      }
    ],
    [
      {
        "text": "외형치수",
        "rowspan": "3",
        "colspan": "1"
      },
      {
        "text": "일체형",
        "rowspan": "3",
        "colspan": "1"
      },
      {
        "text": "길이",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "mm",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "1,240",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "1,240",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "1,330",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "1,330",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "1,660",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "1,860",
        "rowspan": "1",
        "colspan": "1"
      }
    ],
    [
      {
        "text": "높이",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "mm",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "1,373",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "1,373",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "1,413",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "1,413",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "1,613",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "1,613",
        "rowspan": "1",
        "colspan": "1"
      }
    ],
    [
      {
        "text": "폭",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "mm",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "600",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "600",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "790",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "790",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "840",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "840",
        "rowspan": "1",
        "colspan": "1"
      }
    ],
    [
      {
        "text": "제품중량",
        "rowspan": "1",
        "colspan": "3"
      },
      {
        "text": "kg",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "260",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "290",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "380",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "430",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "690",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "790",
        "rowspan": "1",
        "colspan": "1"
      }
    ]
  ],
  "reciprocating-chiller": [
    [
      {
        "text": "MODEL",
        "rowspan": "1",
        "colspan": "3"
      },
      {
        "text": "UNIT",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "SG-25AR",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "SG-30AR",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "SG-40AR",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "SG-50AR",
        "rowspan": "1",
        "colspan": "1"
      }
    ],
    [
      {
        "text": "냉동능력",
        "rowspan": "1",
        "colspan": "3"
      },
      {
        "text": "kcal/h",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "64,700",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "74,900",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "111,500",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "134,100",
        "rowspan": "1",
        "colspan": "1"
      }
    ],
    [
      {
        "text": "압축기",
        "rowspan": "4",
        "colspan": "1"
      },
      {
        "text": "형식",
        "rowspan": "1",
        "colspan": "2"
      },
      {
        "text": "",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "Semi-Hermetic Reciprocating",
        "rowspan": "1",
        "colspan": "6"
      }
    ],
    [
      {
        "text": "정격출력",
        "rowspan": "1",
        "colspan": "2"
      },
      {
        "text": "kW(HP)",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "19(25)",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "22.5(30)",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "30(40)",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "37.5(50)",
        "rowspan": "1",
        "colspan": "1"
      }
    ],
    [
      {
        "text": "기동방식",
        "rowspan": "1",
        "colspan": "2"
      },
      {
        "text": "",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "직입기동",
        "rowspan": "1",
        "colspan": "4"
      }
    ],
    [
      {
        "text": "용량제어",
        "rowspan": "1",
        "colspan": "2"
      },
      {
        "text": "%",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "0,100",
        "rowspan": "1",
        "colspan": "4"
      }
    ],
    [
      {
        "text": "응축기",
        "rowspan": "4",
        "colspan": "1"
      },
      {
        "text": "형식",
        "rowspan": "1",
        "colspan": "2"
      },
      {
        "text": "",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "Fin & Tube Type",
        "rowspan": "1",
        "colspan": "4"
      }
    ],
    [
      {
        "text": "송풍기",
        "rowspan": "1",
        "colspan": "2"
      },
      {
        "text": "",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "직결구동 프로펠러 송풍기",
        "rowspan": "1",
        "colspan": "4"
      }
    ],
    [
      {
        "text": "외기온도",
        "rowspan": "1",
        "colspan": "2"
      },
      {
        "text": "℃",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "35",
        "rowspan": "1",
        "colspan": "4"
      }
    ],
    [
      {
        "text": "송풍기모터",
        "rowspan": "1",
        "colspan": "2"
      },
      {
        "text": "Kw",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "0.4kWx6Px3EA",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "0.75kWx6Px3EA",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "0.75kWx6Px3EA",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "0.75kWx6Px4EA",
        "rowspan": "1",
        "colspan": "1"
      }
    ],
    [
      {
        "text": "증발기",
        "rowspan": "3",
        "colspan": "1"
      },
      {
        "text": "형식",
        "rowspan": "1",
        "colspan": "2"
      },
      {
        "text": "",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "Shell & Tube Type",
        "rowspan": "1",
        "colspan": "4"
      }
    ],
    [
      {
        "text": "냉수 입/출구온도",
        "rowspan": "1",
        "colspan": "2"
      },
      {
        "text": "℃",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "12/7",
        "rowspan": "1",
        "colspan": "4"
      }
    ],
    [
      {
        "text": "냉수량",
        "rowspan": "1",
        "colspan": "2"
      },
      {
        "text": "㎡/h",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "12.9",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "15",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "22.3",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "26.8",
        "rowspan": "1",
        "colspan": "1"
      }
    ],
    [
      {
        "text": "냉매",
        "rowspan": "2",
        "colspan": "1"
      },
      {
        "text": "종류",
        "rowspan": "1",
        "colspan": "2"
      },
      {
        "text": "",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "R-22",
        "rowspan": "1",
        "colspan": "4"
      }
    ],
    [
      {
        "text": "제어방식",
        "rowspan": "1",
        "colspan": "2"
      },
      {
        "text": "",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "감온식 팽창밸브",
        "rowspan": "1",
        "colspan": "4"
      }
    ],
    [
      {
        "text": "전원",
        "rowspan": "2",
        "colspan": "1"
      },
      {
        "text": "주전원",
        "rowspan": "1",
        "colspan": "2"
      },
      {
        "text": "",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "AC / 3ph / 220V, 380V, 440V / 60Hz",
        "rowspan": "1",
        "colspan": "4"
      }
    ],
    [
      {
        "text": "조작전원",
        "rowspan": "1",
        "colspan": "2"
      },
      {
        "text": "",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "AC / 1ph / 220V / 60Hz",
        "rowspan": "1",
        "colspan": "4"
      }
    ],
    [
      {
        "text": "Oil Heater",
        "rowspan": "1",
        "colspan": "3"
      },
      {
        "text": "W",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "100",
        "rowspan": "1",
        "colspan": "4"
      }
    ],
    [
      {
        "text": "보호장치",
        "rowspan": "1",
        "colspan": "3"
      },
      {
        "text": "",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "고, 저압 압력 스위치, 가용전, 과전류계전기, 동결방지용 온도조절기, 안전 변(50HP 이상), 역상방지기 (Scroll 적용)",
        "rowspan": "1",
        "colspan": "4"
      }
    ],
    [
      {
        "text": "작동치",
        "rowspan": "4",
        "colspan": "1"
      },
      {
        "text": "스위치",
        "rowspan": "2",
        "colspan": "1"
      },
      {
        "text": "고압",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "MPa",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "2.4, MANUAL RESET",
        "rowspan": "1",
        "colspan": "4"
      }
    ],
    [
      {
        "text": "저압",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "MPa",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "0.2 / 0.35, AUTO RESET",
        "rowspan": "1",
        "colspan": "4"
      }
    ],
    [
      {
        "text": "가용전",
        "rowspan": "1",
        "colspan": "2"
      },
      {
        "text": "℃",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "72±2",
        "rowspan": "1",
        "colspan": "4"
      }
    ],
    [
      {
        "text": "동결방지기",
        "rowspan": "1",
        "colspan": "2"
      },
      {
        "text": "℃",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "4, MANUAL RESET",
        "rowspan": "1",
        "colspan": "4"
      }
    ],
    [
      {
        "text": "증발기 접속 관경",
        "rowspan": "1",
        "colspan": "3"
      },
      {
        "text": "A",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "65",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "65",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "80",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "100",
        "rowspan": "1",
        "colspan": "1"
      }
    ],
    [
      {
        "text": "외형치수",
        "rowspan": "3",
        "colspan": "1"
      },
      {
        "text": "일체형",
        "rowspan": "3",
        "colspan": "1"
      },
      {
        "text": "길이",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "mm",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "2,310",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "2,450",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "2,760",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "3,180",
        "rowspan": "1",
        "colspan": "1"
      }
    ],
    [
      {
        "text": "높이",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "mm",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "1,805",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "1,805",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "1,905",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "2,057",
        "rowspan": "1",
        "colspan": "1"
      }
    ],
    [
      {
        "text": "폭",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "mm",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "935",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "935",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "1,035",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "1,035",
        "rowspan": "1",
        "colspan": "1"
      }
    ],
    [
      {
        "text": "제품중량",
        "rowspan": "1",
        "colspan": "3"
      },
      {
        "text": "kg",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "1,150",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "1,350",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "1,450",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "1,700",
        "rowspan": "1",
        "colspan": "1"
      }
    ]
  ],
  "screw-chiller": [
    [
      {
        "text": "MODEL",
        "rowspan": "1",
        "colspan": "3"
      },
      {
        "text": "UNIT",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "SG-30AS",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "SG-40AS",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "SG-50AS",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "SG-60AR",
        "rowspan": "1",
        "colspan": "1"
      }
    ],
    [
      {
        "text": "냉동능력",
        "rowspan": "1",
        "colspan": "3"
      },
      {
        "text": "kcal/h",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "88,800",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "112,300",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "140,900",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "164,600",
        "rowspan": "1",
        "colspan": "1"
      }
    ],
    [
      {
        "text": "압축기",
        "rowspan": "4",
        "colspan": "1"
      },
      {
        "text": "형식",
        "rowspan": "1",
        "colspan": "2"
      },
      {
        "text": "",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "Semi-Hermetic SCREW",
        "rowspan": "1",
        "colspan": "6"
      }
    ],
    [
      {
        "text": "정격출력",
        "rowspan": "1",
        "colspan": "2"
      },
      {
        "text": "kW(HP)",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "22.5(30)",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "30(40)",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "37.5(50)",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "45(60)",
        "rowspan": "1",
        "colspan": "1"
      }
    ],
    [
      {
        "text": "기동방식",
        "rowspan": "1",
        "colspan": "2"
      },
      {
        "text": "",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "Y - Δ",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "Part Winding",
        "rowspan": "1",
        "colspan": "3"
      }
    ],
    [
      {
        "text": "용량제어",
        "rowspan": "1",
        "colspan": "2"
      },
      {
        "text": "%",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "0, 25 ~ 100",
        "rowspan": "1",
        "colspan": "4"
      }
    ],
    [
      {
        "text": "응축기",
        "rowspan": "4",
        "colspan": "1"
      },
      {
        "text": "형식",
        "rowspan": "1",
        "colspan": "2"
      },
      {
        "text": "",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "Fin & Tube Type",
        "rowspan": "1",
        "colspan": "4"
      }
    ],
    [
      {
        "text": "송풍기",
        "rowspan": "1",
        "colspan": "2"
      },
      {
        "text": "",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "직결구동형 프로펠러 송풍기",
        "rowspan": "1",
        "colspan": "4"
      }
    ],
    [
      {
        "text": "외기온도",
        "rowspan": "1",
        "colspan": "2"
      },
      {
        "text": "℃",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "35",
        "rowspan": "1",
        "colspan": "4"
      }
    ],
    [
      {
        "text": "송풍기모터",
        "rowspan": "1",
        "colspan": "2"
      },
      {
        "text": "Kw",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "0.75kWx6Px3EA",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "0.75kWx6Px4EA",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "0.75kWx6Px6EA",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "0.75kWx6Px6EA",
        "rowspan": "1",
        "colspan": "1"
      }
    ],
    [
      {
        "text": "증발기",
        "rowspan": "3",
        "colspan": "1"
      },
      {
        "text": "형식",
        "rowspan": "1",
        "colspan": "2"
      },
      {
        "text": "",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "Shell & Tube Type",
        "rowspan": "1",
        "colspan": "4"
      }
    ],
    [
      {
        "text": "냉수 입/출구온도",
        "rowspan": "1",
        "colspan": "2"
      },
      {
        "text": "℃",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "12/7",
        "rowspan": "1",
        "colspan": "4"
      }
    ],
    [
      {
        "text": "냉수량",
        "rowspan": "1",
        "colspan": "2"
      },
      {
        "text": "㎡/h",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "17.8",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "22.5",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "28.2",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "32.9",
        "rowspan": "1",
        "colspan": "1"
      }
    ],
    [
      {
        "text": "냉매",
        "rowspan": "2",
        "colspan": "1"
      },
      {
        "text": "종류",
        "rowspan": "1",
        "colspan": "2"
      },
      {
        "text": "",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "R-22",
        "rowspan": "1",
        "colspan": "4"
      }
    ],
    [
      {
        "text": "제어방식",
        "rowspan": "1",
        "colspan": "2"
      },
      {
        "text": "",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "감온식 팽창밸브",
        "rowspan": "1",
        "colspan": "4"
      }
    ],
    [
      {
        "text": "전원",
        "rowspan": "2",
        "colspan": "1"
      },
      {
        "text": "주전원",
        "rowspan": "1",
        "colspan": "2"
      },
      {
        "text": "",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "AC / 3ph / 220V, 380V, 440V / 60Hz",
        "rowspan": "1",
        "colspan": "4"
      }
    ],
    [
      {
        "text": "조작전원",
        "rowspan": "1",
        "colspan": "2"
      },
      {
        "text": "",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "AC / 1ph / 220V / 60Hz",
        "rowspan": "1",
        "colspan": "4"
      }
    ],
    [
      {
        "text": "Oil Heater",
        "rowspan": "1",
        "colspan": "3"
      },
      {
        "text": "W",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "200",
        "rowspan": "1",
        "colspan": "4"
      }
    ],
    [
      {
        "text": "보호장치",
        "rowspan": "1",
        "colspan": "3"
      },
      {
        "text": "",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "고, 저압 압력 스위치, 가용전, 과전류계전기, 동결방지용 온도조절기, 역상방지기, 토출가스 온도제한 스위치, 안전 변(50HP 이상)",
        "rowspan": "1",
        "colspan": "4"
      }
    ],
    [
      {
        "text": "작동치",
        "rowspan": "5",
        "colspan": "1"
      },
      {
        "text": "스위치",
        "rowspan": "2",
        "colspan": "1"
      },
      {
        "text": "고압",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "MPa",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "2.4, MANUAL RESET",
        "rowspan": "1",
        "colspan": "4"
      }
    ],
    [
      {
        "text": "저압",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "MPa",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "0.2 / 0.35, AUTO RESET",
        "rowspan": "1",
        "colspan": "4"
      }
    ],
    [
      {
        "text": "가용전",
        "rowspan": "1",
        "colspan": "2"
      },
      {
        "text": "℃",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "72±2",
        "rowspan": "1",
        "colspan": "4"
      }
    ],
    [
      {
        "text": "토출가스온도조절기",
        "rowspan": "1",
        "colspan": "2"
      },
      {
        "text": "℃",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "115, MANUAL RESET",
        "rowspan": "1",
        "colspan": "4"
      }
    ],
    [
      {
        "text": "동결방지기",
        "rowspan": "1",
        "colspan": "2"
      },
      {
        "text": "℃",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "4, MANUAL RESET",
        "rowspan": "1",
        "colspan": "4"
      }
    ],
    [
      {
        "text": "증발기 접속 관경",
        "rowspan": "1",
        "colspan": "3"
      },
      {
        "text": "A",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "80",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "80",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "100",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "100",
        "rowspan": "1",
        "colspan": "1"
      }
    ],
    [
      {
        "text": "외형치수",
        "rowspan": "3",
        "colspan": "1"
      },
      {
        "text": "일체형",
        "rowspan": "3",
        "colspan": "1"
      },
      {
        "text": "길이",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "mm",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "2,760",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "3,180",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "2,580",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "2,580",
        "rowspan": "1",
        "colspan": "1"
      }
    ],
    [
      {
        "text": "높이",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "mm",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "1,905",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "2,057",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "1,948",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "1,948",
        "rowspan": "1",
        "colspan": "1"
      }
    ],
    [
      {
        "text": "폭",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "mm",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "1,035",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "1,035",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "1,976",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "1,976",
        "rowspan": "1",
        "colspan": "1"
      }
    ],
    [
      {
        "text": "제품중량",
        "rowspan": "1",
        "colspan": "3"
      },
      {
        "text": "kg",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "1,700",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "1,750",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "2,160",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "2,330",
        "rowspan": "1",
        "colspan": "1"
      }
    ]
  ],
  "double-screw-chiller": [
    [
      {
        "text": "MODEL",
        "rowspan": "1",
        "colspan": "3"
      },
      {
        "text": "UNIT",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "SGD-60AS",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "SGD-80AS",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "SGD-100AS",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "SGD-120AR",
        "rowspan": "1",
        "colspan": "1"
      }
    ],
    [
      {
        "text": "냉동능력",
        "rowspan": "1",
        "colspan": "3"
      },
      {
        "text": "kcal/h",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "177,600",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "224,600",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "281,800",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "329,200",
        "rowspan": "1",
        "colspan": "1"
      }
    ],
    [
      {
        "text": "압축기",
        "rowspan": "4",
        "colspan": "1"
      },
      {
        "text": "형식",
        "rowspan": "1",
        "colspan": "2"
      },
      {
        "text": "",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "Semi-Hermetic SCREW",
        "rowspan": "1",
        "colspan": "6"
      }
    ],
    [
      {
        "text": "정격출력",
        "rowspan": "1",
        "colspan": "2"
      },
      {
        "text": "kW(HP)",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "22.5(30) x 2",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "30(40) x 2",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "37.5(50) x 2",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "45(60) x 2",
        "rowspan": "1",
        "colspan": "1"
      }
    ],
    [
      {
        "text": "기동방식",
        "rowspan": "1",
        "colspan": "2"
      },
      {
        "text": "",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "Y - Δ",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "Part Winding",
        "rowspan": "1",
        "colspan": "3"
      }
    ],
    [
      {
        "text": "용량제어",
        "rowspan": "1",
        "colspan": "2"
      },
      {
        "text": "%",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "0, 25 ~ 100",
        "rowspan": "1",
        "colspan": "4"
      }
    ],
    [
      {
        "text": "응축기",
        "rowspan": "4",
        "colspan": "1"
      },
      {
        "text": "형식",
        "rowspan": "1",
        "colspan": "2"
      },
      {
        "text": "",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "Fin & Tube Type",
        "rowspan": "1",
        "colspan": "4"
      }
    ],
    [
      {
        "text": "송풍기",
        "rowspan": "1",
        "colspan": "2"
      },
      {
        "text": "",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "직결구동형 프로펠러 송풍기",
        "rowspan": "1",
        "colspan": "4"
      }
    ],
    [
      {
        "text": "외기온도",
        "rowspan": "1",
        "colspan": "2"
      },
      {
        "text": "℃",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "35",
        "rowspan": "1",
        "colspan": "4"
      }
    ],
    [
      {
        "text": "송풍기모터",
        "rowspan": "1",
        "colspan": "2"
      },
      {
        "text": "Kw",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "0.75kWx6Px8EA",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "0.75kWx6Px10EA",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "0.75kWx6Px10EA",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "0.75kWx6Px12EA",
        "rowspan": "1",
        "colspan": "1"
      }
    ],
    [
      {
        "text": "증발기",
        "rowspan": "3",
        "colspan": "1"
      },
      {
        "text": "형식",
        "rowspan": "1",
        "colspan": "2"
      },
      {
        "text": "",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "Shell & Tube Type",
        "rowspan": "1",
        "colspan": "4"
      }
    ],
    [
      {
        "text": "냉수 입/출구온도",
        "rowspan": "1",
        "colspan": "2"
      },
      {
        "text": "℃",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "12/7",
        "rowspan": "1",
        "colspan": "4"
      }
    ],
    [
      {
        "text": "냉수량",
        "rowspan": "1",
        "colspan": "2"
      },
      {
        "text": "㎡/h",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "35.5",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "44.9",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "56.4",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "65.9",
        "rowspan": "1",
        "colspan": "1"
      }
    ],
    [
      {
        "text": "냉매",
        "rowspan": "2",
        "colspan": "1"
      },
      {
        "text": "종류",
        "rowspan": "1",
        "colspan": "2"
      },
      {
        "text": "",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "R-22",
        "rowspan": "1",
        "colspan": "4"
      }
    ],
    [
      {
        "text": "제어방식",
        "rowspan": "1",
        "colspan": "2"
      },
      {
        "text": "",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "감온식 팽창밸브",
        "rowspan": "1",
        "colspan": "4"
      }
    ],
    [
      {
        "text": "전원",
        "rowspan": "2",
        "colspan": "1"
      },
      {
        "text": "주전원",
        "rowspan": "1",
        "colspan": "2"
      },
      {
        "text": "",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "AC / 3ph / 220V, 380V, 440V / 60Hz",
        "rowspan": "1",
        "colspan": "4"
      }
    ],
    [
      {
        "text": "조작전원",
        "rowspan": "1",
        "colspan": "2"
      },
      {
        "text": "",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "AC / 1ph / 220V / 60Hz",
        "rowspan": "1",
        "colspan": "4"
      }
    ],
    [
      {
        "text": "Oil Heater",
        "rowspan": "1",
        "colspan": "3"
      },
      {
        "text": "W",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "200 x 2EA",
        "rowspan": "1",
        "colspan": "4"
      }
    ],
    [
      {
        "text": "보호장치",
        "rowspan": "1",
        "colspan": "3"
      },
      {
        "text": "",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "고, 저압 압력 스위치, 가용전, 과전류계전기, 동결방지용 온도조절기, 역상방지기, 토출가스 온도제한 스위치, 안전 변(50HP 이상)",
        "rowspan": "1",
        "colspan": "4"
      }
    ],
    [
      {
        "text": "작동치",
        "rowspan": "5",
        "colspan": "1"
      },
      {
        "text": "스위치",
        "rowspan": "2",
        "colspan": "1"
      },
      {
        "text": "고압",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "MPa",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "2.4, MANUAL RESET",
        "rowspan": "1",
        "colspan": "4"
      }
    ],
    [
      {
        "text": "저압",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "MPa",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "0.2 / 0.35, AUTO RESET",
        "rowspan": "1",
        "colspan": "4"
      }
    ],
    [
      {
        "text": "가용전",
        "rowspan": "1",
        "colspan": "2"
      },
      {
        "text": "℃",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "72±2",
        "rowspan": "1",
        "colspan": "4"
      }
    ],
    [
      {
        "text": "토출가스온도조절기",
        "rowspan": "1",
        "colspan": "2"
      },
      {
        "text": "℃",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "115, MANUAL RESET",
        "rowspan": "1",
        "colspan": "4"
      }
    ],
    [
      {
        "text": "동결방지기",
        "rowspan": "1",
        "colspan": "2"
      },
      {
        "text": "℃",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "4, MANUAL RESET",
        "rowspan": "1",
        "colspan": "4"
      }
    ],
    [
      {
        "text": "증발기 접속 관경",
        "rowspan": "1",
        "colspan": "3"
      },
      {
        "text": "A",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "100",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "125",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "125",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "125",
        "rowspan": "1",
        "colspan": "1"
      }
    ],
    [
      {
        "text": "외형치수",
        "rowspan": "3",
        "colspan": "1"
      },
      {
        "text": "일체형",
        "rowspan": "3",
        "colspan": "1"
      },
      {
        "text": "길이",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "mm",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "3,450",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "4,200",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "4,200",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "5,160",
        "rowspan": "1",
        "colspan": "1"
      }
    ],
    [
      {
        "text": "높이",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "mm",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "1,948",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "1,948",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "1,948",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "1,948",
        "rowspan": "1",
        "colspan": "1"
      }
    ],
    [
      {
        "text": "폭",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "mm",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "1,976",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "1,976",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "1,976",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "1,976",
        "rowspan": "1",
        "colspan": "1"
      }
    ],
    [
      {
        "text": "제품중량",
        "rowspan": "1",
        "colspan": "3"
      },
      {
        "text": "kg",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "3,100",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "3,420",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "3,750",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "4,150",
        "rowspan": "1",
        "colspan": "1"
      }
    ]
  ],
  "compact-cooler": [
    [
      {
        "text": "MODEL",
        "rowspan": "1",
        "colspan": "3"
      },
      {
        "text": "SG-01ACU",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "SG-02ACU",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "SG-03ACU",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "SG-05ACU",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "SG-075ACU",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "SG-10ACU",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "SG-15ACU",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "SG-20ACU",
        "rowspan": "1",
        "colspan": "1"
      }
    ],
    [
      {
        "text": "냉각능력",
        "rowspan": "1",
        "colspan": "2"
      },
      {
        "text": "kcal/h",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "2,600 ~ 2,900",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "5,400 ~ 5,800",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "8,000 ~ 8,700",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "13,500 ~ 14,500",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "20,000 ~ 21,750",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "27,000 ~ 29,000",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "40,000 ~ 42,500",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "52,000 ~ 57,000",
        "rowspan": "1",
        "colspan": "1"
      }
    ],
    [
      {
        "text": "압축기",
        "rowspan": "2",
        "colspan": "1"
      },
      {
        "text": "정격출력",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "KW(HP)",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "0.75(1)",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "1.5(2)",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "2.2(3)",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "3.75(5)",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "5.5(7.5)",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "7.5(10)",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "11.25(15)",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "15(20)",
        "rowspan": "1",
        "colspan": "1"
      }
    ],
    [
      {
        "text": "기동방식",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "직입기동",
        "rowspan": "1",
        "colspan": "8"
      }
    ],
    [
      {
        "text": "응축기",
        "rowspan": "5",
        "colspan": "1"
      },
      {
        "text": "형식",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "-",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "Propeller Fan & Fin Tube",
        "rowspan": "1",
        "colspan": "8"
      }
    ],
    [
      {
        "text": "송풍량",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "㎥/min",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "25",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "50",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "70",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "100",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "180",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "200",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "300",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "400",
        "rowspan": "1",
        "colspan": "1"
      }
    ],
    [
      {
        "text": "송풍기외경",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "Φ",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "400",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "400",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "450",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "500",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "500 * 2EA",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "550 * 2EA",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "650 * 2EA",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "700 * 2EA",
        "rowspan": "1",
        "colspan": "1"
      }
    ],
    [
      {
        "text": "송풍기모터",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "kW",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "0.085",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "0.1",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "0.2",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "0.4",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "0.4 * 2EA",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "0.4 * 2EA",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "0.75 * 2EA",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "0.75 * 2EA",
        "rowspan": "1",
        "colspan": "1"
      }
    ],
    [
      {
        "text": "응축온도",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "℃",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "50",
        "rowspan": "1",
        "colspan": "8"
      }
    ],
    [
      {
        "text": "증발기",
        "rowspan": "4",
        "colspan": "1"
      },
      {
        "text": "형식",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "Water Tank Type",
        "rowspan": "1",
        "colspan": "8"
      }
    ],
    [
      {
        "text": "코일타입",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "Copper Tube",
        "rowspan": "1",
        "colspan": "8"
      }
    ],
    [
      {
        "text": "입구온도",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "℃",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "10℃ ~ 35℃",
        "rowspan": "1",
        "colspan": "8"
      }
    ],
    [
      {
        "text": "출구온도",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "℃",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "5℃ ~ 30℃",
        "rowspan": "1",
        "colspan": "8"
      }
    ],
    [
      {
        "text": "탱크",
        "rowspan": "2",
        "colspan": "1"
      },
      {
        "text": "재질",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "STS 304",
        "rowspan": "1",
        "colspan": "8"
      }
    ],
    [
      {
        "text": "용량",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "liter",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "20",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "40",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "50",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "80",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "100",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "140",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "200",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "250",
        "rowspan": "1",
        "colspan": "1"
      }
    ],
    [
      {
        "text": "펌프",
        "rowspan": "3",
        "colspan": "1"
      },
      {
        "text": "형식",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "DHF2-20",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "DHF2-20",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "DHF2-30",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "DHF4-20",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "DHF4-30",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "DHF4-40",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "DHF8-30",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "DHF8-30",
        "rowspan": "1",
        "colspan": "1"
      }
    ],
    [
      {
        "text": "정격출력",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "kW",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "0.55",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "0.55",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "0.75",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "0.75",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "1.1",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "1.5",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "2.2",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "2.2",
        "rowspan": "1",
        "colspan": "1"
      }
    ],
    [
      {
        "text": "토출량",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "L/min",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "40",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "50",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "60",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "80",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "90",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "130",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "160",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "200",
        "rowspan": "1",
        "colspan": "1"
      }
    ],
    [
      {
        "text": "냉매",
        "rowspan": "1",
        "colspan": "2"
      },
      {
        "text": "",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "R-22 (407C, 134a)",
        "rowspan": "1",
        "colspan": "8"
      }
    ],
    [
      {
        "text": "Controller",
        "rowspan": "1",
        "colspan": "2"
      },
      {
        "text": "",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "Smart Type",
        "rowspan": "1",
        "colspan": "8"
      }
    ],
    [
      {
        "text": "외형치수",
        "rowspan": "1",
        "colspan": "2"
      },
      {
        "text": "L*W*H",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "750x450x890",
        "rowspan": "1",
        "colspan": "2"
      },
      {
        "text": "950x620x1,400",
        "rowspan": "1",
        "colspan": "2"
      },
      {
        "text": "1,350x750x1,770",
        "rowspan": "1",
        "colspan": "2"
      },
      {
        "text": "1,700x900x1,980",
        "rowspan": "1",
        "colspan": "2"
      }
    ],
    [
      {
        "text": "제품중량",
        "rowspan": "1",
        "colspan": "2"
      },
      {
        "text": "kg",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "110",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "160",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "250",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "300",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "500",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "650",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "790",
        "rowspan": "1",
        "colspan": "1"
      },
      {
        "text": "920",
        "rowspan": "1",
        "colspan": "1"
      }
    ]
  ]
};
